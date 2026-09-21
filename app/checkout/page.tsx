import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { TryDemoLink } from "@/components/marketing/TryDemoCta";
import { CHECKOUT_PAY_COPY, PLAN, isStripeConfigured } from "@/lib/billing";
import { MARKETING_LIMITS } from "@/lib/brand";
import { getPlatformStatus, windowsDownloadLabel } from "@/lib/platform-status.server";

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
  const { windowsInstallerReady } = getPlatformStatus();
  const cancelled = searchParams.reason === "cancelled";
  const stripeError = searchParams.reason === "stripe-error";
  const envUnconfigured = !configured;

  const lead = cancelled
    ? "Checkout was cancelled. You can try again, or create an account first."
    : stripeError || (searchParams.reason === "unconfigured" && configured)
      ? "Checkout could not start. Try again in a moment, or create an account first."
      : envUnconfigured
        ? "Checkout is not available on this site yet. You can still create an account. The $69 plan starts after a 14-day trial when payments are switched on."
        : `You will go to Stripe for the $69 monthly plan with a 14-day free trial. ${CHECKOUT_PAY_COPY}. ${windowsDownloadLabel(windowsInstallerReady)}`;

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div>
            <p className="marketing-kicker">Australian bookkeeping · checkout</p>
            <h1 className="marketing-title">Start HyperionInvoices</h1>
            <p className="marketing-lead">
              {PLAN.trialDays} days free, then ${PLAN.amountAud} {PLAN.intervalLabel}. You can stop anytime.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              {envUnconfigured ? (
                <Link href="/signup" className="btn-marketing-primary">
                  Sign up
                </Link>
              ) : (
                <StartTrialButton className="btn-marketing-primary" />
              )}
              {envUnconfigured ? (
                <Link href="/pricing" className="link-quiet">
                  Pricing
                </Link>
              ) : (
                <Link href="/signup" className="link-quiet">
                  Sign up
                </Link>
              )}
              {!envUnconfigured ? (
                <Link href="/pricing" className="link-quiet">
                  Pricing
                </Link>
              ) : null}
              <TryDemoLink className="link-quiet" />
            </div>
            <p className="mt-10 marketing-copy">{MARKETING_LIMITS}</p>
          </div>

          <aside className="card h-fit p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
              Buy → Pay → Download
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              ${PLAN.amountAud} {PLAN.intervalLabel} after {PLAN.trialDays} days free
            </h2>
            <p className="mt-3 marketing-copy">{lead}</p>
            <div className="mt-6 flex flex-col gap-4">
              {envUnconfigured ? (
                <Link href="/signup" className="btn-marketing-primary w-full">
                  Continue to sign up
                </Link>
              ) : (
                <StartTrialButton className="btn-marketing-primary w-full" />
              )}
              <Link href="/pricing" className="link-quiet text-center">
                Back to pricing
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
