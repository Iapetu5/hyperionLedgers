import { NextResponse } from "next/server";
import { getAppUrl, isStripeConfigured, PLAN } from "@/lib/billing";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  email?: string;
};

export async function GET() {
  return NextResponse.json({
    configured: isStripeConfigured(),
    plan: {
      amountAud: PLAN.amountAud,
      intervalLabel: PLAN.intervalLabel,
      trialDays: PLAN.trialDays,
      currency: PLAN.currency,
    },
  });
}

export async function POST(req: Request) {
  const appUrl = getAppUrl();
  const body = (await req.json().catch(() => ({}))) as CheckoutBody;
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!isStripeConfigured()) {
    return NextResponse.json({
      configured: false,
      url: "/signup",
      message:
        "Stripe test keys are not set. Add STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in the Vercel project environment, then redeploy. The sign-up trial path still works.",
    });
  }

  const secret = process.env.STRIPE_SECRET_KEY!.trim();
  const priceId = process.env.STRIPE_PRICE_ID!.trim();
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("subscription_data[trial_period_days]", String(PLAN.trialDays));
  params.set("success_url", `${appUrl}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${appUrl}/pricing?checkout=cancelled`);
  params.set("billing_address_collection", "auto");
  params.set("allow_promotion_codes", "true");
  params.set("locale", "en");
  if (email) params.set("customer_email", email);

  try {
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = (await stripeRes.json()) as { url?: string; error?: { message?: string } };
    if (!stripeRes.ok || !session.url) {
      return NextResponse.json(
        {
          configured: true,
          url: "/checkout?reason=stripe-error",
          message: session.error?.message || "Stripe Checkout could not start. Check the test price ID and secret key.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ configured: true, url: session.url });
  } catch {
    return NextResponse.json(
      {
        configured: true,
        url: "/checkout?reason=stripe-error",
        message: "Stripe Checkout could not start. Try again, or continue with sign up.",
      },
      { status: 502 }
    );
  }
}
