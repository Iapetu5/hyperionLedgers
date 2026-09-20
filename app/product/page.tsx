import Link from "next/link";
import {
  FileText,
  Landmark,
  Calculator,
  Boxes,
  Users,
  Briefcase,
  Wallet,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";

const FEATURES = [
  { icon: FileText, title: "Sales and quotes", body: "Quotes, invoices, repeating templates, and customer pay links." },
  { icon: Wallet, title: "Purchases", body: "Bills, expense claims, purchase orders, and contacts." },
  { icon: Landmark, title: "Banking", body: "Accounts and bank CSV import. Not a live bank feed." },
  { icon: Boxes, title: "Products", body: "A catalogue and stock on hand for the sample organisation." },
  { icon: Briefcase, title: "Projects", body: "Job profit and time against sample studio work." },
  { icon: Users, title: "Payroll", body: "Pay runs and an employee list. Not connected to Single Touch Payroll." },
  { icon: Calculator, title: "GST and BAS", body: "Australian quarterly dates and a BAS draft you can review." },
  { icon: Sparkles, title: "Plain English", body: "Ask what to do next and get a clear answer." },
];

export default function ProductPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
          Next step: start the trial
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Australian bookkeeping you can click through
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/75">
          Quotes, invoices, bills, stock, banking, projects, payroll, BAS, cash, and reports.
          An assistant explains the numbers in plain English.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <StartTrialButton className="btn-primary" />
          <Link
            href="/pricing"
            className="text-sm font-medium text-white/70 underline-offset-4 transition hover:text-white hover:underline"
          >
            Pricing
          </Link>
          <Link
            href="/demo"
            className="text-sm font-medium text-white/70 underline-offset-4 transition hover:text-white hover:underline"
          >
            Open Harbour &amp; Co
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5">
              <Icon className="text-brand-300" size={22} />
              <h2 className="mt-3 font-semibold text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
