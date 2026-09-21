import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";

const GLANCE = [
  "Quotes, invoices, bills, and reports in one place",
  "Your session stays in this browser",
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
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <StartTrialButton className="btn-marketing-primary" />
              <Link href="/signup" className="link-quiet">
                Sign up
              </Link>
              <Link href="/pricing" className="link-quiet">
                Pricing
              </Link>
              <TryDemoLink className="link-quiet" />
            </div>
            <div className="mt-10 space-y-4">
              <p className="marketing-copy">
                HyperionInvoices is made for Australian small business: GST, BAS, super, cash flow,
                sales, stock, and pay — written so you know what to do next.
              </p>
              <p className="marketing-copy">
                We use Australian English and Australian dollars. HyperionInvoices does not send
                forms to the tax office.
                <GuestOnly>
                  {" "}
                  Try a demo first if you want to look around — that path uses sample data, not your
                  real account.
                </GuestOnly>
              </p>
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
            <Link href="/pricing" className="link-quiet mt-4 block text-center">
              See the $69 plan
            </Link>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
