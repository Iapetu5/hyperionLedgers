import Link from "next/link";
import { UserPlus, SlidersHorizontal, LayoutDashboard, Zap } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";

const STEPS = [
  {
    icon: UserPlus,
    title: "1. Start the trial",
    body: "Create your account. Open the $69 a month plan. The first 14 days are free.",
  },
  {
    icon: SlidersHorizontal,
    title: "2. Pay on Stripe",
    body: "Confirm on the payment page. Then you come back to Downloads.",
  },
  {
    icon: LayoutDashboard,
    title: "3. Download the Windows app",
    body: "Unlock the Windows installer. Mac is coming soon. Then make your first invoice.",
  },
];

export default function TryPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-sm font-semibold text-fuchsia-100">
          <Zap size={14} />
          Next step: start the trial
        </div>
        <h1 className="marketing-title">How to start</h1>
        <p className="marketing-lead">
          Start the free trial. Pay on the next page. Then download the Windows app.
          The first 14 days are free. Then it is $69 a month.
        </p>
        <div className="mt-8">
          <StartTrialButton className="btn-marketing-primary" />
        </div>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-base text-slate-100">
          <Link href="/signup" className="link-quiet">
            Sign up
          </Link>
          <Link href="/pricing" className="link-quiet">
            Pricing
          </Link>
          <Link href="/demo" className="link-quiet">
            Open Harbour &amp; Co
          </Link>
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="card flex flex-col p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20 text-brand-200">
                    <Icon size={20} />
                  </span>
                  <h2 className="text-xl font-bold text-white">{s.title}</h2>
                </div>
                <p className="mt-4 flex-1 marketing-copy">{s.body}</p>
              </div>
            );
          })}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
