import { NextResponse } from "next/server";
import {
  persistDownloadGrant,
  persistDownloadGrantFromSubscription,
  recordStripeEvent,
} from "@/lib/entitlements";
import { clientIp, rateLimit } from "@/lib/request-guard";
import {
  isCheckoutSessionId,
  isStripeEventId,
  isStripeWebhookConfigured,
  retrieveCheckoutSession,
  sessionGrantsDownload,
  type StripeCheckoutSession,
  type StripeSubscription,
  subscriptionGrantsDownload,
  verifyStripeSignature,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json({ error: "Stripe webhook secret is not set." }, { status: 503 });
  }
  const ip = clientIp(req);
  if (!rateLimit(`wh:${ip}`, 80, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const raw = await req.text();
  const header = req.headers.get("stripe-signature");
  if (!verifyStripeSignature(raw, header)) {
    if (!rateLimit(`wh-bad:${ip}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: { id?: string; type?: string; data?: { object?: { id?: string } } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!event.id || !isStripeEventId(event.id)) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }
  const fresh = await recordStripeEvent(event.id);
  if (!fresh) return NextResponse.json({ received: true, duplicate: true });

  if (event.type === "checkout.session.completed") {
    const sessionId = event.data?.object?.id ?? "";
    if (isCheckoutSessionId(sessionId)) {
      const inline = event.data?.object as StripeCheckoutSession | undefined;
      const session =
        (await retrieveCheckoutSession(sessionId)) ??
        (inline && sessionGrantsDownload(inline) ? inline : null);
      if (session && sessionGrantsDownload(session)) {
        await persistDownloadGrant(session);
      }
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data?.object as StripeSubscription | undefined;
    if (subscriptionGrantsDownload(sub)) {
      await persistDownloadGrantFromSubscription(sub!);
    }
  }

  return NextResponse.json({ received: true });
}
