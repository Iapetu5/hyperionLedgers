import Link from "next/link";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { PricingCardDemoLink, PricingFooterDemoLine } from "@/components/marketing/PricingDemoLinks";

const FEATURES = [
  "Make quotes, invoices, and bills",
  "See GST on each line, and BAS due dates",
  "See profit and loss, and what you own and owe",
  "Bring in bank transactions",
  "Keep contacts and products in one place",
  "14 days free. Then $69 a month.",
  "Download the Windows app after you pay. Mac is coming soon.",
];

export default function PricingPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="marketing-kicker text-center">Australian bookkeeping · one plan</p>
        <div className="mx-auto mt-3 max-w-2xl text-center">
          <h1 className="marketing-title">One plan. $69 a month.</h1>
          <p className="marketing-lead mx-auto">
            Try HyperionInvoices free for 14 days. See cash, GST, and invoices in plain English.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-lg">
          <div className="card flex flex-col border-brand-300/50 bg-brand-500/10 p-6 shadow-glow sm:p-8">
            <p className="inline-flex w-fit rounded-full bg-brand-300 px-3 py-1 text-sm font-bold text-slate-950">
              14 days free
            </p>
            <h2 className="mt-4 text-2xl font-bold text-white">HyperionInvoices</h2>
            <p className="mt-2 marketing-copy">
              Everything in one plan. No add-ons to buy later.
            </p>
            <p className="mt-6">
              <span className="text-5xl font-bold tracking-tight text-white">$69</span>
              <span className="text-lg text-slate-50"> / month</span>
            </p>
            <p className="mt-3 text-base leading-7 text-slate-50">
              After the free trial. Stop anytime. Pay with card or Apple Pay.
            </p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand-200">
              What is included
            </p>
            <ul className="mt-3 flex-1 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-base leading-7 text-slate-50">
                  <Check size={20} className="mt-0.5 shrink-0 text-brand-200" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-4">
              <StartTrialButton className="btn-marketing-primary w-full" />
              <Link href="/signup" className="link-quiet text-center">
                Sign up
              </Link>
              <PricingCardDemoLink />
            </div>
          </div>
        </div>

        <PricingFooterDemoLine />
        <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-7 text-slate-50">
          Price is in Australian dollars. Pay with card or Apple Pay. You can cancel anytime.
          HyperionInvoices does not send forms to the ATO for you.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
