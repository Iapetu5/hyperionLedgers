"use client";

import Link from "next/link";
import { BarChart3, Calculator, Scale, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { formatAUD } from "@/lib/format";
import { kpis } from "@/lib/sample-data";

const REPORT_LINKS = [
  {
    href: "/demo/reports/profit-loss",
    title: "Profit & loss",
    blurb:
      "Income and expenses for the year to date — a plain-English trading summary for your records.",
    icon: TrendingUp,
  },
  {
    href: "/demo/reports/balance-sheet",
    title: "Balance sheet",
    blurb:
      "What you own and owe at a point in time — cash, receivables, and payables as a demo snapshot.",
    icon: Scale,
  },
  {
    href: "/demo/tax/gst-bas",
    title: "GST & BAS",
    blurb:
      "Quarterly BAS due dates and draft GST on Income / GST Free-aware figures. Lodgement is simulated.",
    icon: Calculator,
  },
];

export default function ReportsPage() {
  const { usesSampleData } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">
          Management reports for your records. Figures are previews from demo or ledger activity —
          they are not ATO-lodged returns and HyperionLedgers does not file with the ATO.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {REPORT_LINKS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="card-inset flex flex-col gap-2 p-4 transition hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-2">
              <r.icon size={18} className="text-cyan-300" />
              <h2 className="font-semibold text-white">{r.title}</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">{r.blurb}</p>
            <span className="mt-auto text-xs font-semibold text-brand-300">Open →</span>
          </Link>
        ))}
      </div>

      {usesSampleData ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h2 className="font-semibold text-white">Profit &amp; loss (YTD preview)</h2>
            <p className="mt-1 text-xs text-slate-400">
              Sample net profit from Harbour &amp; Co — illustrative only, not a lodged tax figure.
            </p>
            <p className="mt-3 text-3xl font-bold text-white">{formatAUD(kpis.netProfitYtd)}</p>
            <Link
              href="/demo/reports/profit-loss"
              className="mt-3 inline-block text-sm font-semibold text-brand-300 hover:underline"
            >
              View full P&amp;L preview
            </Link>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-white">Business health (demo score)</h2>
            <p className="mt-1 text-xs text-slate-400">
              A simple demo score from sample cash and receivables — not a credit or ATO rating.
            </p>
            <p className="mt-3 text-3xl font-bold text-white">
              {kpis.healthScore}{" "}
              <span className="text-lg font-medium text-slate-300">{kpis.healthLabel}</span>
            </p>
            <Link
              href="/demo/reports/balance-sheet"
              className="mt-3 inline-block text-sm font-semibold text-brand-300 hover:underline"
            >
              View balance sheet preview
            </Link>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No report figures yet"
          description="Your blank start keeps these empty on purpose. Create a first invoice or bill, or explore Harbour & Co for sample previews."
          showExploreSample
          actions={[
            { label: "Create invoice", href: "/demo/invoices?mixed=1" },
            { label: "Create bill", href: "/demo/bills?mixed=1" },
            { label: "Back to overview", href: "/demo" },
          ]}
          hint="Sample P&L appears in the Harbour & Co guest demo. Reports never imply ATO lodgement."
        />
      )}
    </div>
  );
}
