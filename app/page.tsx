import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { ShieldCheck, Sparkles, Wallet } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <section className="grid min-w-0 items-center gap-12 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="marketing-kicker">Next step: start the trial</p>
            <h1 className="marketing-title">
              See cash, GST and invoices in plain English.
            </h1>
            <p className="marketing-lead">
              HyperionInvoices keeps the books for a small Australian business. Try it free for 14 days.
              Then it is $69 a month. You can stop anytime. After you pay, you can download the Windows app.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <StartTrialButton className="btn-marketing-primary" />
              <Link href="/signup" className="link-quiet">
                Sign up
              </Link>
              <Link href="/pricing" className="link-quiet">
                Pricing
              </Link>
            </div>
            <p className="mt-4 text-base text-slate-200">
              We do not send forms to the tax office. Mac is coming soon.
            </p>
          </div>

          <div className="card overflow-hidden shadow-soft">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
                One plan
              </p>
              <p className="mt-1 text-xl font-semibold text-white">$69 a month after 14 days free</p>
            </div>
            <div className="space-y-4 p-4">
              <p className="marketing-copy">
                See quotes, invoices, bills, bank imports, and reports. Then see what to do next.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Trial", "14 days"],
                  ["Then", "$69 / mo"],
                  ["Cancel", "Anytime"],
                ].map(([label, value]) => (
                  <div key={label} className="card-inset px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                      {label}
                    </p>
                    <p className="mt-1 text-base font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <StartTrialButton className="btn-marketing-primary w-full" />
              <Link href="/demo" className="link-quiet block text-center">
                Open Harbour &amp; Co
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-200">
          <span>Australian dollars</span>
          <span>GST on each sale</span>
          <span>Dates as DD/MM/YYYY</span>
          <span>See when BAS is due</span>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Wallet,
              title: "Cash in and out",
              body: "See overdue bills and invoices on one page. Then pay or follow up.",
            },
            {
              icon: ShieldCheck,
              title: "GST and BAS dates",
              body: "See GST on each sale. See when the next BAS is due.",
            },
            {
              icon: Sparkles,
              title: "Plain English",
              body: "Ask a simple question. Get a clear next step.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5">
              <Icon className="text-brand-200" size={22} />
              <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-2 marketing-copy">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
