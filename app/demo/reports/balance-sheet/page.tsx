"use client";

import Link from "next/link";
import { Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { formatAUD } from "@/lib/format";
import { accounts, kpis } from "@/lib/sample-data";
import { rollupBlankReports, EMPTY_REPORT_ROLLUP, type BlankReportRollup } from "@/lib/blank-reports";
import { loadUserBills, loadUserInvoices } from "@/lib/user-docs";

export default function BalanceSheetReportPage() {
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

  const cash = usesSampleData
    ? Math.round(accounts.reduce((s, a) => s + a.balance, 0) * 100) / 100
    : rollup.cash;
  const assets = usesSampleData
    ? Math.round((cash + kpis.receivables) * 100) / 100
    : rollup.assets;
  const liabilities = usesSampleData ? kpis.payables : rollup.liabilities;
  const equity = usesSampleData ? Math.round((assets - liabilities) * 100) / 100 : rollup.equity;
  const receivables = usesSampleData ? kpis.receivables : rollup.receivables;
  const payables = usesSampleData ? kpis.payables : rollup.payables;
  const showBlank = !usesSampleData && rollup.hasActivity;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Link href="/demo/reports" className="text-brand-300 hover:underline">
            Reports
          </Link>{" "}
          / Balance sheet
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Balance sheet</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">
          What you own and owe at a point in time. Practice preview. Not sent to the tax office.
        </p>
      </div>

      {usesSampleData ? (
        <>
          <div className="card border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
            Demo sample snapshot · balances rounded · illustrative preview only
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">Assets</div>
              <dl className="divide-y divide-white/10 text-sm">
                {accounts.map((a) => (
                  <div key={a.id} className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-slate-300">{a.name}</dt>
                    <dd className="font-semibold text-white">{formatAUD(a.balance)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-slate-300">Accounts receivable (sample)</dt>
                  <dd className="font-semibold text-white">{formatAUD(receivables)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="font-medium text-white">Total assets (preview)</dt>
                  <dd className="text-lg font-bold text-white">{formatAUD(assets)}</dd>
                </div>
              </dl>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">
                Liabilities &amp; equity
              </div>
              <dl className="divide-y divide-white/10 text-sm">
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-slate-300">Accounts payable (sample)</dt>
                  <dd className="font-semibold text-white">{formatAUD(payables)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-slate-300">Equity (balancing figure)</dt>
                  <dd className="font-semibold text-white">{formatAUD(equity)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="font-medium text-white">Total liabilities &amp; equity</dt>
                  <dd className="text-lg font-bold text-white">{formatAUD(assets)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Cash on hand KPI elsewhere may differ slightly from bank account roll-ups depending on
            reconciliation state — treat both as demo guidance. For GST on Income / GST Free and BAS
            due dates, see{" "}
            <Link href="/demo/tax/gst-bas" className="font-semibold text-brand-300 hover:underline">
              GST &amp; BAS
            </Link>
            .
          </p>
        </>
      ) : showBlank ? (
        <>
          <div className="card border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
            Your organisation · from open invoices and bills · cash $0 until bank imports are included
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">Assets</div>
              <dl className="divide-y divide-white/10 text-sm">
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-slate-300">Cash (not rolled in yet)</dt>
                  <dd className="font-semibold text-white">{formatAUD(cash)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-slate-300">Accounts receivable (open invoices)</dt>
                  <dd className="font-semibold text-white">{formatAUD(receivables)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="font-medium text-white">Total assets (preview)</dt>
                  <dd className="text-lg font-bold text-white">{formatAUD(assets)}</dd>
                </div>
              </dl>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">
                Liabilities &amp; equity
              </div>
              <dl className="divide-y divide-white/10 text-sm">
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-slate-300">Accounts payable (open bills)</dt>
                  <dd className="font-semibold text-white">{formatAUD(payables)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-slate-300">Equity (balancing figure)</dt>
                  <dd className="font-semibold text-white">{formatAUD(equity)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="font-medium text-white">Total liabilities &amp; equity</dt>
                  <dd className="text-lg font-bold text-white">{formatAUD(assets)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Simplified demo snapshot from your docs. For GST and BAS due dates, see{" "}
            <Link href="/demo/tax/gst-bas" className="font-semibold text-brand-300 hover:underline">
              GST &amp; BAS
            </Link>
            .
          </p>
        </>
      ) : (
        <EmptyState
          icon={Scale}
          title="No balance sheet figures yet"
          description="Make an invoice or bill to see a balance sheet preview."
          showExploreSample
          actions={[
            { label: "Create invoice", href: "/demo/invoices?mixed=1", primary: true },
            { label: "Create bill", href: "/demo/bills?mixed=1" },
            { label: "All reports", href: "/demo/reports" },
          ]}
          hint="Balance sheet updates from open invoices and bills. Never an ATO lodgement."
        />
      )}
    </div>
  );
}
