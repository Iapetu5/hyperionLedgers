/** Commercial plan — one price, 14-day trial. Do not add "excl. GST" to customer copy. */

export const PLAN = {
  name: "HyperionInvoices",
  amountAud: 69,
  intervalLabel: "a month",
  trialDays: 14,
  currency: "AUD",
} as const;

/** Hosted Checkout: `card` covers debit, credit, Apple Pay, and Google Pay. */
export const CHECKOUT_PAYMENT_METHOD_TYPES = ["card"] as const;

export const CHECKOUT_PAY_COPY = "Pay with card or Apple Pay";

export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "https://www.hyperioninvoices.com.au";
}

export function isStripeConfigured(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const price = process.env.STRIPE_PRICE_ID?.trim() ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  return (
    /^sk_(test|live)_/.test(secret) &&
    price.startsWith("price_") &&
    /^pk_(test|live)_/.test(publishable)
  );
}
