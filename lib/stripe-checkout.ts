import { NextResponse } from "next/server";
import { CHECKOUT_PAYMENT_METHOD_TYPES, getAppUrl, isStripeConfigured, PLAN } from "@/lib/billing";
import { isDbConfigured } from "@/lib/db";
import { checkoutOriginAllowed, clientIp, rateLimit } from "@/lib/request-guard";
import { getSessionAccount } from "@/lib/server-auth";
import { applyAudLineItems, resolveAudMonthlyPrice } from "@/lib/stripe-price";
import { SIGNUP_FOR_TRIAL } from "@/lib/trial-next";

/** API version that supports adaptive_pricing[enabled]=false. */
const STRIPE_API_VERSION = "2025-03-31.acacia";

type CheckoutBody = {
  email?: string;
};

export function checkoutStatusResponse() {
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

function stripeErrorMessage(session: { error?: { message?: string } }): string {
  const detail = session.error?.message?.trim();
  return detail
    ? `Stripe Checkout could not start: ${detail}`
    : "Stripe Checkout could not start. Check the test price ID and secret key.";
}

async function postCheckoutSession(secret: string, params: URLSearchParams) {
  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: params,
  });
  const session = (await stripeRes.json()) as {
    url?: string;
    error?: { message?: string; type?: string; param?: string };
  };
  return { stripeRes, session };
}

function buildCheckoutParams(input: {
  price: Awaited<ReturnType<typeof resolveAudMonthlyPrice>>;
  appUrl: string;
  email: string;
  accountId?: string;
  methods: readonly string[];
  includeCurrency: boolean;
}) {
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  applyAudLineItems(params, input.price);
  params.set("subscription_data[trial_period_days]", String(PLAN.trialDays));
  params.set("success_url", `${input.appUrl}/downloads?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${input.appUrl}/pricing?checkout=cancelled`);
  params.set("billing_address_collection", "auto");
  params.set("allow_promotion_codes", "true");
  params.set("locale", "en-AU");
  params.set("payment_method_collection", "always");
  // Dashboard Adaptive Pricing defaults to ON — never omit this, never retry with it enabled.
  params.set("adaptive_pricing[enabled]", "false");
  if (input.includeCurrency) params.set("currency", "aud");
  input.methods.forEach((method, i) => {
    params.set(`payment_method_types[${i}]`, method);
  });
  if (input.email) params.set("customer_email", input.email);
  if (input.accountId) {
    params.set("client_reference_id", input.accountId);
    params.set("metadata[userId]", input.accountId);
    params.set("subscription_data[metadata][userId]", input.accountId);
  }
  return params;
}

export async function createCheckoutSession(req: Request) {
  if (!checkoutOriginAllowed(req)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  if (!rateLimit(`checkout:${clientIp(req)}`, 12, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many checkout attempts." }, { status: 429 });
  }

  const appUrl = getAppUrl();
  const body = (await req.json().catch(() => ({}))) as CheckoutBody;
  const account = await getSessionAccount();
  const email = account?.email || (typeof body.email === "string" ? body.email.trim() : "");

  if (isDbConfigured() && !account) {
    return NextResponse.json({
      configured: isStripeConfigured(),
      requiresAuth: true,
      url: SIGNUP_FOR_TRIAL,
      message: "Create an account before starting the free trial.",
    });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({
      configured: false,
      url: "/checkout?reason=unconfigured",
      message:
        "Stripe test keys are not set. Add STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in the Vercel project environment, then redeploy. The sign-up trial path still works.",
    });
  }

  const secret = process.env.STRIPE_SECRET_KEY!.trim();
  const price = await resolveAudMonthlyPrice(process.env.STRIPE_PRICE_ID!.trim());

  const attempts: { methods: readonly string[]; includeCurrency: boolean }[] = [
    { methods: CHECKOUT_PAYMENT_METHOD_TYPES, includeCurrency: true },
    { methods: ["card"], includeCurrency: true },
    { methods: CHECKOUT_PAYMENT_METHOD_TYPES, includeCurrency: false },
    { methods: ["card"], includeCurrency: false },
  ];

  try {
    let lastMessage = "Stripe Checkout could not start. Check the test price ID and secret key.";
    for (const attempt of attempts) {
      const params = buildCheckoutParams({
        price,
        appUrl,
        email,
        accountId: account?.id,
        methods: attempt.methods,
        includeCurrency: attempt.includeCurrency,
      });
      const { stripeRes, session } = await postCheckoutSession(secret, params);
      if (stripeRes.ok && session.url) {
        return NextResponse.json({ configured: true, url: session.url });
      }
      lastMessage = stripeErrorMessage(session);
      const err = `${session.error?.message ?? ""} ${session.error?.param ?? ""}`.toLowerCase();
      const retryable = err.includes("link") || err.includes("currency") || err.includes("adaptive");
      if (!retryable) break;
    }
    return NextResponse.json(
      {
        configured: true,
        url: "/checkout?reason=stripe-error",
        message: lastMessage,
      },
      { status: 502 }
    );
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
