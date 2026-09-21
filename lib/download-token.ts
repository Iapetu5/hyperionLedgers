import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { db, ensureSchema, isDbConfigured } from "@/lib/db";

const used = new Set<string>();
const TOKEN_TTL_MS = 10 * 60 * 1000;

function signingSecret(): string {
  return process.env.SESSION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
}

export function canSignDownloadTokens(): boolean {
  return signingSecret().length >= 16;
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

export async function issueDownloadToken(subject: string): Promise<string | null> {
  if (!canSignDownloadTokens()) return null;
  try {
    const jti = randomBytes(16).toString("hex");
    const exp = Date.now() + TOKEN_TTL_MS;
    const payload = `${jti}.${exp}.${subject.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 80)}`;
    if (isDbConfigured()) {
      await ensureSchema();
      await db()`
        INSERT INTO download_tokens (jti, expires_at)
        VALUES (${jti}, to_timestamp(${exp / 1000}))
      `;
    }
    return `${payload}.${sign(payload)}`;
  } catch {
    return null;
  }
}

export async function consumeDownloadToken(token: string): Promise<boolean> {
  if (!canSignDownloadTokens() || !token) return false;
  try {
    const parts = token.split(".");
    if (parts.length < 4) return false;
    const sig = parts.pop()!;
    const payload = parts.join(".");
    const [jti, expRaw] = parts;
    if (!/^[a-f0-9]{32}$/.test(jti)) return false;
    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const expected = sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    if (isDbConfigured()) {
      await ensureSchema();
      const rows = (await db()`
        UPDATE download_tokens
        SET used_at = now()
        WHERE jti = ${jti} AND used_at IS NULL AND expires_at > now()
        RETURNING jti
      `) as { jti: string }[];
      return Boolean(rows[0]);
    }

    if (used.has(jti)) return false;
    used.add(jti);
    if (used.size > 2000) {
      const first = used.values().next().value;
      if (first) used.delete(first);
    }
    return true;
  } catch {
    return false;
  }
}
