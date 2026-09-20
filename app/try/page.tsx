import Link from "next/link";
import { UserPlus, SlidersHorizontal, LayoutDashboard, Zap } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";

const STEPS = [
  {
    icon: UserPlus,
    title: "1. Buy — start the trial",
    body: "Create your account and open Stripe Checkout for the $69 a month plan. The first 14 days are free.",
  },
  {
    icon: SlidersHorizontal,
    title: "2. Pay — confirm on Stripe",
    body: "Checkout verifies the subscription (test mode until live keys are set). Then you return to Downloads.",
  },
  {
    icon: LayoutDashboard,
    title: "3. Download the Windows app",
    body: "Unlock HyperionInvoices-Setup.exe for Windows. Mac is coming soon. Then create your first invoice.",
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
          One path: Buy → Pay on Stripe → Download the Windows app. Start the 14-day free trial,
          then $69 a month. After checkout, Downloads unlocks HyperionInvoices for Windows.
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
