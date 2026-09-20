import Link from "next/link";
import { UserPlus, SlidersHorizontal, LayoutDashboard, Zap, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const STEPS = [
  {
    icon: UserPlus,
    title: "Start the trial",
    body: "Name, email, and business name. The 14-day trial starts as soon as the account is created.",
    href: "/signup",
    cta: "Start free trial",
  },
  {
    icon: SlidersHorizontal,
    title: "Set up the organisation",
    body: "GST, financial year, optional ABN, and whether to start empty or look at sample figures. This follows signup.",
    href: "/signup",
    cta: "Continue to setup",
  },
  {
    icon: LayoutDashboard,
    title: "Create the first invoice",
    body: "A blank organisation opens on Overview with Create invoice as the next step. About two minutes from signup.",
    href: "/signup",
    cta: "Start free trial",
  },
];

export default function TryPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-fuchsia-200">
          <Zap size={12} />
          14 days free · $69 a month after
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">Start the trial</h1>
        <p className="mt-3 max-w-2xl text-lg text-white/75">
          One plan at $69 a month covers the books. Sign up, set up the organisation, then create the first invoice.
          Or look at Harbour &amp; Co first, with no account.
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
                <Link href={s.href} className="btn-primary mt-5">
                  {s.cta}
                  <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 card border-brand-400/30 bg-gradient-to-br from-brand-500/15 to-fuchsia-500/15 p-6">
          <p className="font-semibold text-white">Want to look first?</p>
          <p className="mt-1 text-sm text-slate-300">
            Open Harbour &amp; Co with no sign-up. The trial is still $69 a month after 14 days, when you are ready.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/signup" className="btn-primary inline-flex">
              Start free trial
              <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="btn-secondary inline-flex">
              See the $69 plan
            </Link>
            <Link href="/demo" className="btn-secondary inline-flex">
              Optional sample data
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
