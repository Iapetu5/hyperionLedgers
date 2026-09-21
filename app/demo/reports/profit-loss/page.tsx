"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { formatAUD } from "@/lib/format";
import { rollupBlankReports, rollupSampleReports, EMPTY_REPORT_ROLLUP, type BlankReportRollup } from "@/lib/blank-reports";
import { loadBills, loadInvoices } from "@/lib/books-client";

export default function ProfitLossReportPage() {
  const { usesSampleData } = useAuth();
  const [rollup, setRollup] = useState<BlankReportRollup>(EMPTY_REPORT_ROLLUP);

  useEffect(() => {
    if (usesSampleData) {
      setRollup(EMPTY_REPORT_ROLLUP);
      return;
    }
    const reload = async () =>
      setRollup(rollupBlankReports(await loadInvoices(), await loadBills()));
    void reload();
    const onUpdate = () => void reload();
    window.addEventListener("hl-user-docs-updated", onUpdate);
    window.addEventListener("hl-doc-status", onUpdate);
    return () => {
      window.removeEventListener("hl-user-docs-updated", onUpdate);
      window.removeEventListener("hl-doc-status", onUpdate);
    };
  }, [usesSampleData]);

  const sampleRollup = usesSampleData ? rollupSampleReports() : null;
  const incomeExGst = usesSampleData ? sampleRollup!.incomeExGst : rollup.incomeExGst;
  const incomeGst = usesSampleData ? sampleRollup!.incomeGst : rollup.incomeGst;
  const expenseExGst = usesSampleData ? sampleRollup!.expenseExGst : rollup.expenseExGst;
  const expenseGst = usesSampleData ? sampleRollup!.expenseGst : rollup.expenseGst;
  const netProfit = usesSampleData ? sampleRollup!.netProfit : rollup.netProfit;
  const showBlank = !usesSampleData && rollup.hasActivity;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Link href="/demo/reports" className="text-brand-300 hover:underline">
            Reports
          </Link>{" "}
          / Profit &amp; loss
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Profit &amp; loss</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">
          Shows trading income and expenses for the period. Amounts are tax-exclusive where noted;
          GST on Income / GST Free lines affect GST boxes on BAS, not this operating profit view.
          Practice preview. Not sent to the tax office.
        </p>
      </div>

      {usesSampleData ? (
        <>
          <div className="card border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
            Demo sample period · figures rounded for readability · illustrative draft only
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">
              Year to date (sample)
            </div>
            <dl className="divide-y divide-white/10 text-sm">
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-slate-300">Income (ex tax, from sample invoices)</dt>
                <dd className="font-semibold text-white">{formatAUD(incomeExGst)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-slate-400">of which GST on Income (collected)</dt>
                <dd className="text-slate-300">{formatAUD(incomeGst)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-slate-300">Expenses (ex tax, from sample bills)</dt>
                <dd className="font-semibold text-white">{formatAUD(expenseExGst)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-slate-400">of which GST on Expenses (credits)</dt>
                <dd className="text-slate-300">{formatAUD(expenseGst)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-white">Net profit (YTD preview)</dt>
                <dd className="text-lg font-bold text-white">{formatAUD(netProfit)}</dd>
              </div>
            </dl>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Net profit matches the ex-tax income minus expenses roll-up of listed invoices and bills
            (not a full general ledger). GST Free lines are included in ex-tax income/expense but do
            not appear in the GST rows.{" "}
            <Link href="/demo/tax/gst-bas#ytd-gst" className="font-semibold text-brand-300 hover:underline">
              Open year-to-date GST
            </Link>{" "}
            for the amount you would use when paying the ATO (practice figure), or{" "}
            <Link href="/demo/tax/gst-bas#quarter-draft" className="font-semibold text-brand-300 hover:underline">
              this quarter&apos;s BAS draft
            </Link>
            . HyperionInvoices does not lodge with the ATO.
          </p>
        </>
      ) : showBlank ? (
        <>
          <div className="card border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
            Your organisation · year-to-date across all invoices and bills · preview only
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">
              Year to date (your docs)
            </div>
            <dl className="divide-y divide-white/10 text-sm">
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-slate-300">Income (ex tax, from your invoices)</dt>
                <dd className="font-semibold text-white">{formatAUD(incomeExGst)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-slate-400">of which GST on Income (collected)</dt>
                <dd className="text-slate-300">{formatAUD(incomeGst)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-slate-300">Expenses (ex tax, from your bills)</dt>
                <dd className="font-semibold text-white">{formatAUD(expenseExGst)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-slate-400">of which GST on Expenses (credits)</dt>
                <dd className="text-slate-300">{formatAUD(expenseGst)}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-medium text-white">Net profit (YTD preview)</dt>
                <dd className="text-lg font-bold text-white">{formatAUD(netProfit)}</dd>
              </div>
            </dl>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Simplified roll-up of your listed invoices and bills (not a full general ledger). GST Free
            lines are included in ex-tax totals but not in the GST rows. These GST rows are
            year-to-date across all documents; GST &amp; BAS draft boxes count only the derived
            quarter, so the two can differ.{" "}
            <Link href="/demo/tax/gst-bas#ytd-gst" className="font-semibold text-brand-300 hover:underline">
              Open year-to-date GST
            </Link>{" "}
            for the amount you would use when paying the ATO this Australian financial year (practice
            figure), or{" "}
            <Link href="/demo/tax/gst-bas#quarter-draft" className="font-semibold text-brand-300 hover:underline">
              this quarter&apos;s draft
            </Link>
            . HyperionInvoices does not lodge with the ATO.
          </p>
        </>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="No profit & loss figures yet"
          description="Create an invoice or bill. This page will fill in with profit and loss from those documents."
          actions={[
            { label: "Create invoice", href: "/demo/invoices?mixed=1", primary: true },
            { label: "Create bill", href: "/demo/bills?mixed=1" },
            { label: "All reports", href: "/demo/reports" },
          ]}
          hint="P&L updates from your invoices and bills. Nothing here is filed with the ATO."
        />
      )}
    </div>
  );
}
