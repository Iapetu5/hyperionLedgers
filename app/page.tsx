import Link from "next/link";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { ArrowRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      <header className="page-hero">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary">
              Log in
            </Link>
            <Link href="/demo" className="btn-primary">
              Try the demo
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
            Australian bookkeeping, made clear
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            See cash, GST and invoices in plain English — before you commit.
          </h1>
          <p className="mt-4 text-lg text-white/80">
            HyperionLedgers is a demo of modern bookkeeping for Australian small business.
            Browse the Harbour &amp; Co sample organisation first — no sign-up required.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/demo" className="btn-primary !px-6 !py-3 text-base">
              Open Harbour &amp; Co
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/try"
              className="text-sm font-medium text-white/70 underline-offset-4 transition hover:text-white hover:underline"
            >
              How to try
            </Link>
            <Link
              href="/product"
              className="text-sm font-medium text-white/70 underline-offset-4 transition hover:text-white hover:underline"
            >
              What&apos;s in the demo
            </Link>
          </div>
          <p className="mt-3 text-sm text-white/60">
            Demo only — no commercial, no live bank feeds, real payments, or ATO lodgement.
            Optional demo accounts stay in this browser.
          </p>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Wallet,
              title: "Cash & payables",
              body: "Spot overdue bills and invoices, then act from the overview.",
            },
            {
              icon: ShieldCheck,
              title: "GST & BAS calendar",
              body: "Australian quarterly due dates with a simulated BAS draft.",
            },
            {
              icon: Sparkles,
              title: "Plain-English assistant",
              body: "Ask what to do next — pre-written demo answers, not live AI.",
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
    </div>
  );
}
