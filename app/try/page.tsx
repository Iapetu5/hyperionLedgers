import Link from "next/link";
import { UserPlus, SlidersHorizontal, LayoutDashboard, Zap } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";

const STEPS = [
  {
    icon: UserPlus,
    title: "1. Create your account",
    body: "Name, email, and business name. The 14-day trial starts when the account is created.",
  },
  {
    icon: SlidersHorizontal,
    title: "2. Set up the organisation",
    body: "GST, financial year, optional ABN, and whether to start empty or look at sample figures.",
  },
  {
    icon: LayoutDashboard,
    title: "3. Create the first invoice",
    body: "Your overview opens with Create invoice as the next step. About two minutes from sign-up.",
  },
];

export default function TryPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-fuchsia-200">
          <Zap size={12} />
          Next step: start the trial
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">How it works</h1>
        <p className="mt-3 max-w-2xl text-lg text-white/75">
          One path: start the 14-day free trial, set up your organisation, then create the first invoice.
          After the trial it is $69 a month.
        </p>
        <div className="mt-8">
          <StartTrialButton className="btn-primary" />
        </div>
        <p className="mt-3 text-sm text-white/60">
          Or{" "}
          <Link href="/signup" className="font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
            Sign up
          </Link>
          {" · "}
          <Link href="/pricing" className="font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
            Pricing
          </Link>
          {" · "}
          <Link href="/demo" className="font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
            Open Harbour &amp; Co
          </Link>
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="card flex flex-col p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
                    <Icon size={20} />
                  </span>
                  <h2 className="font-bold text-white">{s.title}</h2>
                </div>
                <p className="mt-4 flex-1 text-sm text-slate-300">{s.body}</p>
              </div>
            );
          })}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
