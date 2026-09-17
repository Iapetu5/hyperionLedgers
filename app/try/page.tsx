import Link from "next/link";
import { LayoutDashboard, SlidersHorizontal, UserPlus, Zap, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Open Harbour & Co",
    body: "Jump straight into the sample organisation — quotes, invoices, bills, banking, BAS prep, reports, and the assistant. No sign-up required.",
    href: "/demo",
    cta: "Try the demo",
  },
  {
    icon: UserPlus,
    title: "Optional browser account",
    body: "If you want your own org name, create a demo account. It stays in this browser only — nothing is sent to a real backend.",
    href: "/signup",
    cta: "Create a local account",
  },
  {
    icon: SlidersHorizontal,
    title: "Optional setup",
    body: "A short onboarding covers GST registration, financial year end, optional ABN, and whether to start with sample ledger data or a blank slate.",
    href: "/onboarding",
    cta: "Open setup",
  },
];

export default function TryPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-fuchsia-200">
          <Zap size={12} />
          No sign-up required · browser-only demo accounts
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">How to try the demo</h1>
        <p className="mt-3 max-w-2xl text-lg text-white/75">
          Start with the Harbour &amp; Co sample organisation. Sign-up is optional and only stores an account in this browser.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="card flex flex-col p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {i + 1}</p>
                    <h2 className="font-bold text-white">{s.title}</h2>
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm text-slate-300">{s.body}</p>
                <Link href={s.href} className={i === 0 ? "btn-primary mt-5" : "btn-secondary mt-5"}>
                  {s.cta}
                  <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 card border-brand-400/30 bg-gradient-to-br from-brand-500/15 to-fuchsia-500/15 p-6">
          <p className="font-semibold text-white">Harbour &amp; Co is open now</p>
          <p className="mt-1 text-sm text-slate-300">
            Guests can browse the full sample organisation with no account. Demo only — no commercial, no ATO lodgement.
          </p>
          <Link href="/demo" className="btn-primary mt-4 inline-flex">
            Try the demo
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
