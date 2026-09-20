import Link from "next/link";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";

const FEATURES = [
  "Quotes, invoices, and bills in one place",
  "GST on each line, with BAS due dates in view",
  "Profit and loss, and a balance sheet",
  "Bank transactions you can import",
  "Contacts, products, and a plain-English next step",
  "Full access for 14 days. Then $69 a month.",
  "Windows app download after checkout. Mac coming soon.",
];

export default function PricingPage() {
  return (
    <div>
      <SiteHeader variant="compact" />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-300">
          Next step: start the trial
        </p>
        <div className="mx-auto mt-3 max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            One plan. $69 a month.
          </h1>
          <p className="mt-4 text-white/75">
            Buy → Pay on Stripe → Download the Windows app. Start free for 14 days. Then $69 a
            month. Cancel anytime. Quotes, invoices, bills, banking tools, and reports.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <div className="card relative flex flex-col border-brand-400/50 bg-brand-500/10 p-6 shadow-glow">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-slate-950 shadow-glow">
              14-day free trial
            </span>
            <h2 className="text-xl font-bold text-white">HyperionInvoices</h2>
            <p className="mt-1 text-sm text-slate-300">
              One price for the books. Not a starter plan you outgrow.
            </p>
            <p className="mt-5">
              <span className="text-4xl font-bold text-white">$69</span>
              <span className="text-sm text-slate-400"> / month</span>
            </p>
            <p className="mt-1 text-sm text-slate-300">After the trial. Cancel anytime.</p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-300" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <StartTrialButton className="btn-primary" />
              <Link href="/signup" className="text-center text-sm font-medium text-white/70 underline-offset-4 hover:text-white hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-slate-400">
          Want to look around first?{" "}
          <Link href="/demo" className="font-medium text-brand-300 hover:underline">
            Try a demo
          </Link>
          {" "}
          with no account, or{" "}
          <Link href="/try" className="font-medium text-brand-300 hover:underline">
            see how the trial starts
          </Link>
          .
        </p>
        <p className="mt-3 text-center text-xs text-slate-500">
          Prices in Australian dollars. Cancel anytime. HyperionInvoices does not lodge with the ATO.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
