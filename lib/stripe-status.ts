import { ensureSchema, isDbConfigured } from "@/lib/db";
import { canSignDownloadTokens } from "@/lib/download-token";
import { isStripeConfigured, PLAN } from "@/lib/billing";
import { isStripeWebhookConfigured } from "@/lib/stripe";

function envPresent(name: string, test: (value: string) => boolean): boolean {
  const value = process.env[name]?.trim() ?? "";
  return Boolean(value) && test(value);
}

export async function stripeEnvDiagnostics() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const price = process.env.STRIPE_PRICE_ID?.trim() ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const sessionSecret =
    process.env.SESSION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";

  let schemaApplied = false;
  if (isDbConfigured()) {
    try {
      await ensureSchema();
      schemaApplied = true;
    } catch {
      schemaApplied = false;
    }
  }

  return {
    stripe: {
      configured: isStripeConfigured(),
      secretKey: /^sk_(test|live)_/.test(secret),
      priceId: price.startsWith("price_"),
      publishableKey: /^pk_(test|live)_/.test(publishable),
      webhookSecret: isStripeWebhookConfigured(),
    },
    persistence: {
      database: isDbConfigured(),
      sessionSecret: sessionSecret.length >= 16,
      downloadTokens: canSignDownloadTokens(),
      schemaApplied,
    },
    plan: {
      amountAud: PLAN.amountAud,
      intervalLabel: PLAN.intervalLabel,
      trialDays: PLAN.trialDays,
      currency: PLAN.currency,
    },
    missing: [
      !envPresent("STRIPE_SECRET_KEY", (v) => /^sk_(test|live)_/.test(v)) ? "STRIPE_SECRET_KEY" : null,
      !envPresent("STRIPE_PRICE_ID", (v) => v.startsWith("price_")) ? "STRIPE_PRICE_ID" : null,
      !envPresent("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", (v) => /^pk_(test|live)_/.test(v))
        ? "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        : null,
      !isStripeWebhookConfigured() ? "STRIPE_WEBHOOK_SECRET" : null,
      !isDbConfigured() ? "DATABASE_URL" : null,
      sessionSecret.length < 16 ? "SESSION_SECRET" : null,
    ].filter(Boolean),
  };
}
