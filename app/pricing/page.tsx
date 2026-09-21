import Link from "next/link";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

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
      <SiteHeader variant="compact" />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="marketing-kicker text-center">Next step: start the trial</p>
        <div className="mx-auto mt-3 max-w-2xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            One plan. $69 a month.
          </h1>
          <p className="marketing-lead mx-auto">
            Try it free for 14 days. See cash, GST, and invoices in plain English.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <div className="card relative flex flex-col border-brand-300/60 bg-brand-500/10 p-6 shadow-glow">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-300 px-3 py-1 text-sm font-bold text-slate-950 shadow-glow">
              14 days free
            </span>
            <h2 className="text-2xl font-bold text-white">HyperionInvoices</h2>
            <p className="mt-2 marketing-copy">
              Everything in one plan. No add-ons to buy later.
            </p>
            <p className="mt-5">
              <span className="text-5xl font-bold text-white">$69</span>
              <span className="text-base text-slate-200"> / month</span>
            </p>
            <p className="mt-2 text-base text-slate-100">After the free trial. Stop anytime.</p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-base text-slate-100">
                  <Check size={18} className="mt-0.5 shrink-0 text-brand-200" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/signup" className="btn-primary">
                Start free trial
              </Link>
              <Link href="/signup" className="link-quiet text-center">
                Sign up
              </Link>
              <Link href="/demo" className="link-quiet text-center">
                Try a demo
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-base text-slate-100">
          Want to look around first?{" "}
          <Link href="/demo" className="font-semibold text-brand-200 hover:underline">
            Try a demo
          </Link>
          {" "}
          with no account, or{" "}
          <Link href="/try" className="font-semibold text-brand-200 hover:underline">
            see how the trial starts
          </Link>
          .
        </p>
        <p className="mt-4 text-center text-base text-slate-200">
          Price is in Australian dollars. You can cancel anytime. We do not send forms to the ATO for you.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
