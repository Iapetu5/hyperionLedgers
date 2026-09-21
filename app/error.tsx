"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { TryDemoLink } from "@/components/marketing/TryDemoCta";
import { MARKETING_LIMITS } from "@/lib/brand";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div>
            <p className="marketing-kicker">Australian bookkeeping · something went wrong</p>
            <h1 className="marketing-title">HyperionInvoices could not load this page</h1>
            <p className="marketing-lead">
              Try again, or go back home. Your books are unchanged. Nothing was sent to the tax office.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button type="button" className="btn-marketing-primary" onClick={() => reset()}>
                Try again
              </button>
              <Link href="/" className="link-quiet">
                Home
              </Link>
              <Link href="/pricing" className="link-quiet">
                Pricing
              </Link>
              <TryDemoLink className="link-quiet" />
            </div>
            <p className="mt-10 marketing-copy">{MARKETING_LIMITS}</p>
          </div>

          <aside className="card h-fit p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Meanwhile</p>
            <p className="mt-3 marketing-copy">
              You can still start the free trial, or look at pricing. This error is not a lodgement
              or a bank feed.
            </p>
            <StartTrialButton className="btn-marketing-primary mt-6 w-full" />
            <Link href="/contact" className="link-quiet mt-4 block text-center">
              Contact
            </Link>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
