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
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
              Next step: start the trial
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              See cash, GST and invoices in plain English.
            </h1>
            <p className="mt-4 text-lg text-white/80">
              HyperionInvoices is bookkeeping for Australian small business. Try it free for 14 days.
              Then it is $69 a month. Cancel anytime. After you pay, download the Windows app.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StartTrialButton className="btn-primary" />
              <Link
                href="/signup"
                className="text-sm font-medium text-white/70 underline-offset-4 transition hover:text-white hover:underline"
              >
                Sign up
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-white/70 underline-offset-4 transition hover:text-white hover:underline"
              >
                Pricing
              </Link>
            </div>
            <p className="mt-3 text-sm text-white/50">
              HyperionInvoices does not lodge with the ATO. Mac is coming soon.
            </p>
          </div>

          <div className="card overflow-hidden shadow-soft">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                One plan
              </p>
              <p className="mt-1 text-lg font-semibold text-white">$69 a month after 14 days free</p>
            </div>
            <div className="space-y-4 p-4">
              <p className="text-sm leading-relaxed text-white/85">
                Quotes, invoices, bills, bank imports, and reports — so you can see what to do next.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Trial", "14 days"],
                  ["Then", "$69 / mo"],
                  ["Cancel", "Anytime"],
                ].map(([label, value]) => (
                  <div key={label} className="card-inset px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <StartTrialButton className="btn-primary w-full" />
              <Link href="/demo" className="block text-center text-sm font-medium text-white/60 underline-offset-4 hover:text-white hover:underline">
                Open Harbour &amp; Co
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/55">
          <span>Australian dollars</span>
          <span>GST on each line</span>
          <span>Dates as DD/MM/YYYY</span>
          <span>BAS due dates</span>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Wallet,
              title: "Cash in and out",
              body: "See overdue bills and invoices on one page, then act.",
            },
            {
              icon: ShieldCheck,
              title: "GST and BAS dates",
              body: "Australian quarterly dates, with a draft you can review.",
            },
            {
              icon: Sparkles,
              title: "Plain English",
              body: "Ask what to do next and get a clear answer.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5">
              <Icon className="text-brand-300" size={22} />
              <h2 className="mt-3 font-semibold text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-300">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
