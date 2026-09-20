import { NextResponse } from "next/server";
import { persistDownloadGrant, recordStripeEvent } from "@/lib/entitlements";
import { isStripeWebhookConfigured, sessionGrantsDownload, verifyStripeSignature } from "@/lib/stripe";
import type { StripeCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json({ error: "Stripe webhook secret is not set." }, { status: 503 });
  }
  const raw = await req.text();
  const header = req.headers.get("stripe-signature");
  if (!verifyStripeSignature(raw, header)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  let event: { id?: string; type?: string; data?: { object?: StripeCheckoutSession } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  if (event.id) {
    const fresh = await recordStripeEvent(event.id);
    if (!fresh) return NextResponse.json({ received: true, duplicate: true });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    if (session && sessionGrantsDownload(session)) {
      await persistDownloadGrant(session);
    }
  }
  return NextResponse.json({ received: true });
}
