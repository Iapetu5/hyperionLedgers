import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingPageActions } from "@/components/marketing/MarketingPageActions";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { GuestOnly } from "@/components/marketing/TryDemoCta";
import { MARKETING_LIMITS } from "@/lib/brand";

const GLANCE = [
  "Quotes, invoices, bills, and reports in one place",
  "Start with your own organisation, or look around first",
  "Not a tax agent, BAS agent, or financial adviser",
];

export default function AboutPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div>
            <p className="marketing-kicker">Australian bookkeeping · who we are</p>
            <h1 className="marketing-title">About HyperionInvoices</h1>
            <p className="marketing-lead">
              HyperionInvoices keeps the books for a small Australian business.
              See cash, GST, and invoices in plain English.
            </p>
            <MarketingPageActions />
            <div className="mt-10 space-y-4">
              <p className="marketing-copy">
                HyperionInvoices is made for Australian small business: GST, BAS, cash flow,
                sales, and invoices — written so you know what to do next.
              </p>
              <p className="marketing-copy">
                We use Australian English and Australian dollars. Adding a company does not
                register you with the tax office.
                <GuestOnly>
                  {" "}
                  Try a demo first if you want to look around — that path uses sample data, not your
                  real account.
                </GuestOnly>
              </p>
              <p className="marketing-copy">{MARKETING_LIMITS}</p>
            </div>
          </div>

          <aside className="card h-fit p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">At a glance</p>
            <ul className="mt-4 space-y-3 text-base leading-7 text-slate-50">
              {GLANCE.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-brand-300" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <StartTrialButton className="btn-marketing-primary mt-6 w-full" />
            <Link href="/pricing" className="link-quiet marketing-tap-link mt-4 w-full justify-center">
              See the $69 plan
            </Link>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
