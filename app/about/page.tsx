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
              Product demo · not a live accounting service
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">About HyperionLedgers</h1>
            <p className="mt-4 text-lg text-white/80">
              Accounting software for Australian small businesses that want clarity first — accurate books and an explanation of what&apos;s going on.
            </p>
            <div className="mt-6 space-y-4 text-white/75">
              <p>
                HyperionLedgers is built around the realities of Australian small business: GST, BAS, super, cash flow, sales, inventory and payroll —
                presented in plain English so you always know what to do next.
              </p>
              <p>
                This site is a <strong className="text-white">product demo</strong> with fictional sample data (Harbour &amp; Co Studio).
                ATO lodgements and bank feeds are simulated. We use Australian English and AUD throughout.
              </p>
            </div>
          </div>

          <aside className="card h-fit p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">At a glance</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {[
                "Full suite UI for Australian SMB bookkeeping",
                "Demo auth stored in your browser",
                "Jump straight into sample data, or sign up to set up your own demo org",
                "Not a tax agent, BAS agent, or financial adviser",
              ].map((item, i) => (
                <li key={item} className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i % 2 === 0 ? "bg-brand-400" : "bg-fuchsia-500"}`} />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/try" className="btn-primary mt-6 w-full">
              How to try the demo
              <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
