import Link from "next/link";
import {
  ArrowRight,
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

const FEATURES = [
  { icon: FileText, title: "Sales & quotes", body: "Quotes, invoices, recurring templates and customer pay links (demo)." },
  { icon: Wallet, title: "Purchases", body: "Bills, expense claims, purchase orders and contacts." },
  { icon: Landmark, title: "Banking", body: "Accounts, CSV statement import and reconciliation list — no live bank API." },
  { icon: Boxes, title: "Products & inventory", body: "Catalogue, stock on hand and low-stock signals for the sample org." },
  { icon: Briefcase, title: "Projects", body: "Job profitability and time against sample studio work." },
  { icon: Users, title: "Payroll", body: "Demo pay runs and employee list — not connected to Single Touch Payroll." },
  { icon: Calculator, title: "GST & BAS", body: "Australian quarterly calendar and a simulated BAS draft." },
  { icon: Sparkles, title: "Plain-English assistant", body: "Ask what to do next — pre-written demo replies, not live AI." },
];

export default function ProductPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">Product</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          A full Australian bookkeeping suite you can click through
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/75">
          Quotes, invoices, bills, inventory, banking, projects, payroll, BAS, cash flow and reporting —
          with an assistant that translates the sample numbers into plain English.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/demo" className="btn-primary !px-6 !py-3">
            Open Harbour &amp; Co
            <ArrowRight size={16} />
          </Link>
          <Link href="/try" className="btn-secondary !border-white/30 !bg-white/10 !text-white hover:!bg-white/20">
            How to try
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5">
              <Icon className="text-brand-600" size={22} />
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
