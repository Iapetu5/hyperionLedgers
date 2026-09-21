import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { HomeHeroLead } from "@/components/marketing/HomeHeroLead";
import { HomeHeroActions } from "@/components/marketing/HomeHeroActions";
import { HomePreviewDemoButton } from "@/components/marketing/HomePreviewDemoButton";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { ShieldCheck, Sparkles, Wallet } from "lucide-react";

const TRUST_POINTS = [
  "Australian dollars",
  "GST on each sale",
  "Dates as DD/MM/YYYY",
  "See when BAS is due",
];

const FEATURES = [
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
];

export default function HomePage() {
  return (
    <div>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <section className="grid min-w-0 items-start gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="min-w-0">
            <BrandLogo size={72} className="mb-6" />
            <p className="marketing-kicker">Australian bookkeeping · 14 days free</p>
            <h1 className="marketing-title">
              See cash, GST and invoices in plain English.
            </h1>
            <HomeHeroLead />
            <HomeHeroActions />
            <p className="mt-5 text-base leading-7 text-slate-100">
              HyperionInvoices does not send forms to the tax office. Mac is coming soon.
            </p>
          </div>

          <div className="card overflow-hidden shadow-soft">
            <div className="border-b border-white/15 px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
                One plan
              </p>
              <p className="mt-1.5 text-2xl font-semibold leading-snug text-white">
                $69 a month after 14 days free
              </p>
            </div>
            <div className="space-y-5 p-5">
              <p className="marketing-copy">
                See quotes, invoices, bills, bank imports, and reports. Then see what to do next.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Trial", "14 days"],
                  ["Then", "$69 / mo"],
                  ["Cancel", "Anytime"],
                ].map(([label, value]) => (
                  <div key={label} className="card-inset px-3 py-3">
                    <p className="text-sm font-semibold text-slate-100">{label}</p>
                    <p className="mt-1 text-base font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <StartTrialButton className="btn-marketing-primary w-full" />
              <HomePreviewDemoButton />
            </div>
          </div>
        </section>

        <section aria-label="Built for Australian small business" className="mt-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
            Built for Australia
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-1 gap-y-2 text-base leading-7 text-slate-50">
            {TRUST_POINTS.map((point, index) => (
              <li key={point} className="flex items-center">
                {index > 0 ? (
                  <span aria-hidden="true" className="mx-3 hidden text-white/35 sm:inline">
                    ·
                  </span>
                ) : null}
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="marketing-section-title">What you can do in HyperionInvoices</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-50">
            One place for money in, money out, and the next GST date — written so you can follow it.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-6">
                <Icon className="text-brand-200" size={24} aria-hidden="true" />
                <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-2 marketing-copy">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
