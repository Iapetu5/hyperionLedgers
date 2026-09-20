import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db, ensureSchema, isDbConfigured } from "@/lib/db";
import { getSessionAccount } from "@/lib/server-auth";
import type { StripeCheckoutSession } from "@/lib/stripe";
import { sessionEmail, sessionGrantsDownload } from "@/lib/stripe";

export const ENTITLEMENT_COOKIE = "hl_entitlement";

function signingSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    ""
  );
}

export function signEntitlement(sessionId: string): string {
  const secret = signingSecret();
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${sessionId}.${exp}`;
  const sig = createHmac("sha256", secret || "hyperionledgers-entitlement").update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function readEntitlementCookie(): string | null {
  const raw = cookies().get(ENTITLEMENT_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length < 3) return null;
  const sig = parts.pop()!;
  const exp = parts.pop()!;
  const sessionId = parts.join(".");
  if (Date.now() > Number(exp)) return null;
  const payload = `${sessionId}.${exp}`;
  const expected = createHmac("sha256", signingSecret() || "hyperionledgers-entitlement")
    .update(payload)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return sessionId.startsWith("cs_") ? sessionId : null;
}

export function setEntitlementCookie(sessionId: string) {
  cookies().set(ENTITLEMENT_COOKIE, signEntitlement(sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function recordStripeEvent(eventId: string): Promise<boolean> {
  if (!isDbConfigured() || !eventId) return true;
  await ensureSchema();
  const existing = (await db()`SELECT id FROM stripe_events WHERE id = ${eventId} LIMIT 1`) as { id: string }[];
  if (existing[0]) return false;
  await db()`INSERT INTO stripe_events (id) VALUES (${eventId})`;
  return true;
}

export async function persistDownloadGrant(session: StripeCheckoutSession): Promise<void> {
  if (!sessionGrantsDownload(session) || !isDbConfigured()) return;
  await ensureSchema();
  const email = sessionEmail(session)?.trim().toLowerCase() ?? "";
  const userId = session.client_reference_id || session.metadata?.userId || "";
  const sub = session.subscription;
  const subId = typeof sub === "string" ? sub : sub?.id ?? null;
  const status = typeof sub === "object" && sub?.status ? sub.status : "trialing";
  if (userId) {
    await db()`
      UPDATE organisations
      SET
        has_paid_download = true,
        subscription_status = ${status},
        stripe_checkout_session_id = ${session.id},
        stripe_subscription_id = ${subId}
      WHERE user_id = ${userId}
    `;
    return;
  }
  if (!email) return;
  await db()`
    UPDATE organisations o
    SET
      has_paid_download = true,
      subscription_status = ${status},
      stripe_checkout_session_id = ${session.id},
      stripe_subscription_id = ${subId}
    FROM users u
    WHERE o.user_id = u.id AND u.email = ${email}
  `;
}

export async function grantDownloadFromSession(session: StripeCheckoutSession): Promise<void> {
  if (!sessionGrantsDownload(session)) return;
  setEntitlementCookie(session.id);
  await persistDownloadGrant(session);
}

export async function hasDownloadAccess(): Promise<boolean> {
  const account = await getSessionAccount();
  if (account?.hasPaidDownload) return true;
  if (readEntitlementCookie()) return true;
  return false;
}
