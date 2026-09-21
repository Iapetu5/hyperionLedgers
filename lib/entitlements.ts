import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db, ensureSchema, isDbConfigured } from "@/lib/db";
import { cookieSecure } from "@/lib/request-guard";
import { getSessionAccount } from "@/lib/server-auth";
import type { StripeCheckoutSession, StripeSubscription } from "@/lib/stripe";
import {
  isCheckoutSessionId,
  sessionEmail,
  sessionGrantsDownload,
  subscriptionGrantsDownload,
} from "@/lib/stripe";

export const ENTITLEMENT_COOKIE = "hl_entitlement";

function signingSecret(): string {
  return process.env.SESSION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
}

function canSign(): boolean {
  return signingSecret().length >= 16;
}

export function signEntitlement(sessionId: string): string | null {
  if (!canSign() || !isCheckoutSessionId(sessionId)) return null;
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${sessionId}.${exp}`;
  const sig = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function readEntitlementCookie(): string | null {
  if (!canSign()) return null;
  const raw = cookies().get(ENTITLEMENT_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length < 3) return null;
  const sig = parts.pop()!;
  const exp = parts.pop()!;
  const sessionId = parts.join(".");
  if (Date.now() > Number(exp) || !isCheckoutSessionId(sessionId)) return null;
  const payload = `${sessionId}.${exp}`;
  const expected = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return sessionId;
}

export function setEntitlementCookie(sessionId: string) {
  const value = signEntitlement(sessionId);
  if (!value) return;
  cookies().set(ENTITLEMENT_COOKIE, value, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function recordStripeEvent(eventId: string): Promise<boolean> {
  if (!eventId.startsWith("evt_")) return false;
  if (!isDbConfigured()) return true;
  await ensureSchema();
  const inserted = (await db()`
    INSERT INTO stripe_events (id) VALUES (${eventId})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `) as { id: string }[];
  return Boolean(inserted[0]);
}

async function writeOrgEntitlement(input: {
  userId?: string;
  email?: string;
  status: string;
  checkoutSessionId?: string | null;
  subscriptionId?: string | null;
}): Promise<void> {
  if (!isDbConfigured()) return;
  await ensureSchema();
  const userId = input.userId?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  if (userId) {
    await db()`
      UPDATE organisations
      SET
        has_paid_download = true,
        subscription_status = ${input.status},
        stripe_checkout_session_id = ${input.checkoutSessionId ?? null},
        stripe_subscription_id = ${input.subscriptionId ?? null}
      WHERE user_id = ${userId}
    `;
    return;
  }
  if (!email) return;
  await db()`
    UPDATE organisations o
    SET
      has_paid_download = true,
      subscription_status = ${input.status},
      stripe_checkout_session_id = ${input.checkoutSessionId ?? null},
      stripe_subscription_id = ${input.subscriptionId ?? null}
    FROM users u
    WHERE o.user_id = u.id AND u.email = ${email}
  `;
}

export async function persistDownloadGrant(session: StripeCheckoutSession): Promise<void> {
  if (!sessionGrantsDownload(session)) return;
  const email = sessionEmail(session)?.trim().toLowerCase() ?? "";
  const userId = session.client_reference_id || session.metadata?.userId || "";
  const sub = session.subscription;
  const subId = typeof sub === "string" ? sub : sub?.id ?? null;
  const status = typeof sub === "object" && sub?.status ? sub.status : "trialing";
  await writeOrgEntitlement({
    userId,
    email,
    status,
    checkoutSessionId: session.id,
    subscriptionId: subId,
  });
}

export async function persistDownloadGrantFromSubscription(sub: StripeSubscription): Promise<void> {
  if (!subscriptionGrantsDownload(sub)) return;
  const userId = sub.metadata?.userId?.trim() ?? "";
  await writeOrgEntitlement({
    userId,
    status: sub.status ?? "trialing",
    subscriptionId: sub.id,
  });
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
