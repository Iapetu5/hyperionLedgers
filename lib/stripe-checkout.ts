import { NextResponse } from "next/server";
import { CHECKOUT_PAYMENT_METHOD_TYPES, getAppUrl, isStripeConfigured, PLAN } from "@/lib/billing";
import { isDbConfigured } from "@/lib/db";
import { checkoutOriginAllowed, clientIp, rateLimit } from "@/lib/request-guard";
import { getSessionAccount } from "@/lib/server-auth";
import { resolveAudMonthlyPriceId } from "@/lib/stripe-price";
import { SIGNUP_FOR_TRIAL } from "@/lib/trial-next";

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
  priceId: string;
  appUrl: string;
  email: string;
  accountId?: string;
  methods: readonly string[];
  disableAdaptivePricing: boolean;
}) {
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", input.priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("subscription_data[trial_period_days]", String(PLAN.trialDays));
  params.set("success_url", `${input.appUrl}/downloads?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${input.appUrl}/pricing?checkout=cancelled`);
  params.set("billing_address_collection", "auto");
  params.set("allow_promotion_codes", "true");
  params.set("locale", "en-AU");
  params.set("payment_method_collection", "always");
  if (input.disableAdaptivePricing) {
    params.set("adaptive_pricing[enabled]", "false");
  }
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
  const priceId = await resolveAudMonthlyPriceId(process.env.STRIPE_PRICE_ID!.trim());

  const attempts: { methods: readonly string[]; disableAdaptivePricing: boolean }[] = [
    { methods: CHECKOUT_PAYMENT_METHOD_TYPES, disableAdaptivePricing: true },
    { methods: ["card"], disableAdaptivePricing: true },
    { methods: CHECKOUT_PAYMENT_METHOD_TYPES, disableAdaptivePricing: false },
    { methods: ["card"], disableAdaptivePricing: false },
  ];

  try {
    let lastMessage = "Stripe Checkout could not start. Check the test price ID and secret key.";
    for (const attempt of attempts) {
      const params = buildCheckoutParams({
        priceId,
        appUrl,
        email,
        accountId: account?.id,
        methods: attempt.methods,
        disableAdaptivePricing: attempt.disableAdaptivePricing,
      });
      const { stripeRes, session } = await postCheckoutSession(secret, params);
      if (stripeRes.ok && session.url) {
        return NextResponse.json({ configured: true, url: session.url });
      }
      lastMessage = stripeErrorMessage(session);
      const err = `${session.error?.message ?? ""} ${session.error?.param ?? ""}`.toLowerCase();
      const linkIssue = err.includes("link");
      const adaptiveIssue = err.includes("adaptive");
      if (!linkIssue && !adaptiveIssue) break;
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
