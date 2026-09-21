import Link from "next/link";
import { UserPlus, SlidersHorizontal, LayoutDashboard, Zap } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";

const STEPS = [
  {
    icon: UserPlus,
    title: "1. Start free trial",
    body: "Create your account. The first 14 days are free. Then it is $69 a month.",
  },
  {
    icon: SlidersHorizontal,
    title: "2. Answer a few setup questions",
    body: "Add your business, GST, and year end. One question at a time.",
  },
  {
    icon: LayoutDashboard,
    title: "3. Make your first invoice",
    body: "Then download the Windows app after you pay if you want it on your computer. Mac is coming soon.",
  },
];

export default function TryPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-sm font-semibold text-fuchsia-100">
          <Zap size={14} />
          14 days free · then $69 a month
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">How to start</h1>
        <p className="mt-3 max-w-2xl text-lg text-white/80">
          Start the free trial. Answer a few setup questions. Then make your first invoice.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <StartTrialButton className="btn-primary" />
          <Link href="/demo" className="text-sm font-medium text-white/80 hover:text-white hover:underline">
            Try a demo
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-white/80 hover:text-white hover:underline">
            See the $69 plan
          </Link>
          <Link href="/signup" className="text-sm font-medium text-white/80 hover:text-white hover:underline">
            Sign up
          </Link>
        </div>

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
