import Link from "next/link";
import { Eye, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function AboutPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-fuchsia-200">
              <Eye size={12} />
              $69 a month · 14-day free trial
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">About HyperionInvoices</h1>
            <p className="mt-4 text-lg text-white/80">
              Accounting software for Australian small businesses that want clarity first — accurate books and an explanation of what&apos;s going on.
            </p>
            <div className="mt-6 space-y-4 text-white/75">
              <p>
                HyperionInvoices is built around the realities of Australian small business: GST, BAS, super, cash flow, sales, inventory and payroll —
                presented in plain English so you always know what to do next.
              </p>
              <p>
                The /demo path is a walkthrough with sample data — not a real HyperionInvoices account.
                ATO lodgements and bank feeds are simulated. We use Australian English and AUD throughout.
              </p>
            </div>
          </div>

          <aside className="card h-fit p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">At a glance</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {[
                "Full suite UI for Australian SMB bookkeeping",
                "Your session stays in this browser",
                "Try a demo, or start with your own organisation",
                "Not a tax agent, BAS agent, or financial adviser",
              ].map((item, i) => (
                <li key={item} className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i % 2 === 0 ? "bg-brand-400" : "bg-fuchsia-500"}`} />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary mt-6 w-full">
              Start free trial
              <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="mt-3 block text-center text-sm font-medium text-white/70 underline-offset-4 hover:text-white hover:underline">
              See pricing — $69 a month
            </Link>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
