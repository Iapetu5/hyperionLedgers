import { createHmac, timingSafeEqual } from "crypto";

export type StripeCheckoutSession = {
  id: string;
  status?: string;
  mode?: string;
  payment_status?: string;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  subscription?: string | { id?: string; status?: string } | null;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
};

export type StripeSubscription = {
  id: string;
  status?: string;
  metadata?: Record<string, string> | null;
  customer?: string | null;
};

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim().startsWith("whsec_"));
}

export function stripeSecret(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

export function isCheckoutSessionId(value: string): boolean {
  return /^cs_(test|live)_[A-Za-z0-9]{8,128}$/.test(value);
}

export function isStripeEventId(value: string): boolean {
  return /^evt_[A-Za-z0-9]{8,128}$/.test(value);
}

export function verifyStripeSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const [k, ...rest] = piece.split("=");
      return [k.trim(), rest.join("=")];
    })
  );
  const timestamp = parts.t;
  const signatures = header
    .split(",")
    .filter((p) => p.trim().startsWith("v1="))
    .map((p) => p.trim().slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const ageSec = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(Number(timestamp)) || ageSec > 60 * 5) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signatures.some((sig) => {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function retrieveCheckoutSession(sessionId: string): Promise<StripeCheckoutSession | null> {
  if (!/^sk_(test|live)_/.test(stripeSecret()) || !isCheckoutSessionId(sessionId)) return null;
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
    { headers: { Authorization: `Bearer ${stripeSecret()}` } }
  );
  if (!res.ok) return null;
  return (await res.json()) as StripeCheckoutSession;
}

export function sessionGrantsDownload(session: StripeCheckoutSession | null): boolean {
  if (!session) return false;
  if (session.status !== "complete") return false;
  const sub = session.subscription;
  const subStatus = typeof sub === "object" && sub ? sub.status : undefined;
  if (subStatus && !["trialing", "active", "past_due"].includes(subStatus)) return false;
  return session.mode === "subscription" || session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

export function sessionEmail(session: StripeCheckoutSession): string | null {
  return session.customer_email || session.customer_details?.email || null;
}

export function subscriptionGrantsDownload(sub: StripeSubscription | null | undefined): boolean {
  if (!sub?.id) return false;
  return ["trialing", "active", "past_due"].includes(sub.status ?? "");
}
