import Link from "next/link";
import { UserPlus, SlidersHorizontal, LayoutDashboard } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { TryPageDemoLink } from "@/components/marketing/TryDemoCard";
import { GuestOnly } from "@/components/marketing/TryDemoCta";

const STEPS = [
  {
    icon: UserPlus,
    step: "1",
    title: "Start free trial",
    body: "Create your account. The first 14 days are free. Then it is $69 a month.",
  },
  {
    icon: SlidersHorizontal,
    step: "2",
    title: "Answer a few setup questions",
    body: "Add your business, GST, and year end. You can start with a blank set of books.",
  },
  {
    icon: LayoutDashboard,
    step: "3",
    title: "Make your first invoice",
    body: "Then download the Windows app after you pay if you want it on your computer. Mac is coming soon.",
  },
];

export default function TryPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="marketing-kicker">Australian bookkeeping · 14 days free</p>
        <h1 className="marketing-title">How to start</h1>
        <p className="marketing-lead">
          Start the HyperionInvoices free trial. Answer a few setup questions. Then make your first invoice.
          <GuestOnly> Or try a demo first if you want to look around with sample data.</GuestOnly>
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <StartTrialButton className="btn-marketing-primary" />
          <Link href="/signup" className="link-quiet">
            Sign up
          </Link>
          <Link href="/pricing" className="link-quiet">
            See the $69 plan
          </Link>
          <TryPageDemoLink className="link-quiet" />
        </div>
        <GuestOnly>
          <p className="mt-4 text-sm leading-7 text-slate-200">
            Demo · sample data — not your real account
          </p>
        </GuestOnly>

        <section className="mt-16">
          <h2 className="marketing-section-title">Three steps</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-50">
            One primary path: start the trial. You can stop anytime.
          </p>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="card flex flex-col p-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
                    Step {s.step}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-200">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <h3 className="text-xl font-semibold text-white">{s.title}</h3>
                  </div>
                  <p className="mt-4 flex-1 marketing-copy">{s.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <p className="mt-14 max-w-2xl text-base leading-7 text-slate-50">
          HyperionInvoices does not send forms to the tax office. Mac is coming soon.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
