import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { TryDemoLink } from "@/components/marketing/TryDemoCta";
import { MARKETING_LIMITS } from "@/lib/brand";

export default function NotFound() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div>
            <p className="marketing-kicker">Australian bookkeeping · page not found</p>
            <h1 className="marketing-title">This page is not in HyperionInvoices</h1>
            <p className="marketing-lead">
              The link may be old, or the address may be mistyped. Start the free trial, or go back
              home.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <StartTrialButton className="btn-marketing-primary" />
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
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Try next</p>
            <ul className="mt-4 space-y-3 text-base leading-7 text-slate-50">
              <li>
                <Link href="/product" className="link-quiet">
                  Product
                </Link>
                {" — "}what HyperionInvoices can do
              </li>
              <li>
                <Link href="/try" className="link-quiet">
                  How it works
                </Link>
                {" — "}start the trial in three steps
              </li>
              <li>
                <Link href="/contact" className="link-quiet">
                  Contact
                </Link>
                {" — "}leave a note in this browser
              </li>
            </ul>
            <Link href="/" className="btn-marketing-primary mt-6 w-full">
              Back to home
            </Link>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
