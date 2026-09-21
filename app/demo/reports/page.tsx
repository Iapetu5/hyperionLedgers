"use client";

import Link from "next/link";
import { BarChart3, Calculator, Scale, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { formatAUD } from "@/lib/format";
import { kpis } from "@/lib/sample-data";
import { rollupBlankReports, rollupSampleReports, EMPTY_REPORT_ROLLUP, type BlankReportRollup } from "@/lib/blank-reports";
import { loadUserBills, loadUserInvoices } from "@/lib/user-docs";

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
      "Quarterly BAS due dates and draft GST figures. Practice preview — not sent to the tax office.",
    icon: Calculator,
  },
];

export default function ReportsPage() {
  const { usesSampleData } = useAuth();
  const [rollup, setRollup] = useState<BlankReportRollup>(EMPTY_REPORT_ROLLUP);

  useEffect(() => {
    if (usesSampleData) {
      setRollup(EMPTY_REPORT_ROLLUP);
      return;
    }
    const reload = () => setRollup(rollupBlankReports(loadUserInvoices(), loadUserBills()));
    reload();
    window.addEventListener("hl-user-docs-updated", reload);
    window.addEventListener("hl-doc-status", reload);
    return () => {
      window.removeEventListener("hl-user-docs-updated", reload);
      window.removeEventListener("hl-doc-status", reload);
    };
  }, [usesSampleData]);

  const showBlankFigures = !usesSampleData && rollup.hasActivity;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">
          Practice preview. Not sent to the tax office.
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
              Net profit from demo listed invoices and bills — illustrative only, not a lodged tax figure.
            </p>
            <p className="mt-3 text-3xl font-bold text-white">{formatAUD(rollupSampleReports().netProfit)}</p>
            <p className="mt-1 text-xs text-slate-500">Matches listed invoice/bill roll-up on P&amp;L</p>
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
      ) : showBlankFigures ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h2 className="font-semibold text-white">Profit &amp; loss (from your docs)</h2>
            <p className="mt-1 text-xs text-slate-400">
              Rolled up from your invoices and bills — preview only, not an ATO figure.
            </p>
            <p className="mt-3 text-3xl font-bold text-white">{formatAUD(rollup.netProfit)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {rollup.invoiceCount} invoice{rollup.invoiceCount === 1 ? "" : "s"} ·{" "}
              {rollup.billCount} bill{rollup.billCount === 1 ? "" : "s"}
            </p>
            <Link
              href="/demo/reports/profit-loss"
              className="mt-3 inline-block text-sm font-semibold text-brand-300 hover:underline"
            >
              View full P&amp;L preview
            </Link>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-white">Position snapshot</h2>
            <p className="mt-1 text-xs text-slate-400">
              Receivables and payables from open docs. Cash stays $0 until bank imports are included.
            </p>
            <p className="mt-3 text-3xl font-bold text-white">{formatAUD(rollup.assets)}</p>
            <p className="mt-1 text-xs text-slate-500">
              AR {formatAUD(rollup.receivables)} · AP {formatAUD(rollup.payables)}
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
          description="Make an invoice or bill in your organisation, or Try a demo as a guest to see sample previews."
          showExploreSample
          actions={[
            { label: "Create invoice", href: "/demo/invoices?mixed=1", primary: true },
            { label: "Create bill", href: "/demo/bills?mixed=1" },
            { label: "Back to overview", href: "/demo" },
          ]}
          hint="Reports update from your invoices and bills. Sample figures stay in the guest demo. Nothing here is lodged with the ATO."
        />
      )}
    </div>
  );
}
