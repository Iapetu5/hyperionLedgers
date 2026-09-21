import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { CHECKOUT_PAY_COPY, PLAN, isStripeConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { status?: string; reason?: string; session_id?: string };
}) {
  if (searchParams.status === "success") {
    const sid = searchParams.session_id?.trim();
    redirect(sid ? `/downloads?session_id=${encodeURIComponent(sid)}` : "/downloads");
  }

  const configured = isStripeConfigured();
  const cancelled = searchParams.reason === "cancelled";
  const stripeError = searchParams.reason === "stripe-error";
  const unconfigured = searchParams.reason === "unconfigured";

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
            Buy → Pay → Download
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Start HyperionInvoices — ${PLAN.amountAud} {PLAN.intervalLabel}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {cancelled
              ? "Checkout was cancelled. You can try again, or create an account first."
              : stripeError
                ? "Stripe Checkout could not start. Check the test keys and price ID in Vercel, then try again."
                : unconfigured
                  ? "Stripe test keys are not set in this environment. Sign up still works; add the keys in Vercel and redeploy to open Checkout."
                : configured
                  ? `You will go to Stripe Checkout (test mode) for the $69 monthly plan with a 14-day free trial. ${CHECKOUT_PAY_COPY}. Google Pay shows on the same Checkout when Stripe supports it on that device. After payment you land on Downloads for the Windows app.`
                  : "The buy path is ready. Stripe test keys are not in this environment yet, so Checkout cannot open. Sign up still works, and Nicholas can add the keys in Vercel without changing DNS."}
          </p>
          {!configured ? (
            <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
              <p className="font-semibold text-white">Set these Vercel env vars, then redeploy:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-50/90">
                <li>
                  <code>STRIPE_SECRET_KEY</code> — Stripe test secret (<code>sk_test_…</code>)
                </li>
                <li>
                  <code>STRIPE_PRICE_ID</code> — $69 AUD / month Price ID (<code>price_…</code>)
                </li>
                <li>
                  <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> — test publishable (<code>pk_test_…</code>)
                </li>
                <li>
                  <code>STRIPE_WEBHOOK_SECRET</code> — webhook signing secret (<code>whsec_…</code>)
                </li>
                <li>
                  <code>NEXT_PUBLIC_APP_URL</code> — <code>https://www.hyperioninvoices.com.au</code>
                </li>
              </ul>
              <p className="mt-2 text-xs text-amber-100/80">
                Create a recurring $69 AUD monthly price in Stripe test mode and paste its ID. Enable Cards, Apple Pay, and Google Pay in the Stripe Dashboard (see docs/STRIPE_APPLE_PAY.md). Do not put live keys in the repo.
              </p>
            </div>
          ) : null}
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/signup" className="btn-primary">
              Continue to sign up
              <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="btn-secondary">
              Back to pricing
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
