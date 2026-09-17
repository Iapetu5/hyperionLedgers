"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, FileCheck2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { BasDueDates } from "@/components/bas/BasDueDates";
import { formatAUD, formatDateAU } from "@/lib/format";
import { basPeriods, gstBas } from "@/lib/sample-data";

export default function GstBasPage() {
  const { usesSampleData, user } = useAuth();
  const gstOn = user?.gstRegistered !== false;
  const [simLodged, setSimLodged] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">GST &amp; BAS</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">
          Draft GST figures and due dates for your records. Line tax follows Xero-style{" "}
          <span className="text-white/90">GST on Income</span> /{" "}
          <span className="text-white/90">GST Free</span> (and expense equivalents). HyperionLedgers
          does not connect to or lodge with the ATO — lodgement here is always simulated.
        </p>
      </div>

      <BasDueDates />

      {!gstOn && (
        <div className="card border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Your account is marked as not GST registered. BAS widgets still show for demo education —
          treat figures as illustrative only.
        </div>
      )}

      {usesSampleData ? (
        <>
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Current period draft
                </p>
                <h2 className="mt-1 font-semibold text-white">{gstBas.period}</h2>
                <p className="text-sm text-slate-300">
                  {simLodged
                    ? "Simulated lodgement marked — not sent to the ATO"
                    : gstBas.status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-400">Net GST (preview)</p>
                <p className="text-lg font-bold text-white">{formatAUD(gstBas.netGst)}</p>
                <p className="text-[11px] text-slate-500">Illustrative draft · for your records</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              GST amounts below come from <strong className="text-slate-300">GST on Income</strong>{" "}
              sales lines and <strong className="text-slate-300">GST on Expenses</strong> purchase
              lines. <strong className="text-slate-300">GST Free</strong> income/expense lines do not
              add to these GST boxes.
            </p>

            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["GST on Income", gstBas.gstOnSales, "Sales lines at GST on Income (10%)"],
                ["GST on Expenses", gstBas.gstOnPurchases, "Purchase lines at GST on Expenses"],
                ["PAYG withheld", gstBas.paygWithheld, "Payroll preview (demo)"],
              ].map(([label, val, hint]) => (
                <div key={String(label)} className="card-inset p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-1 font-semibold text-white">{formatAUD(Number(val))}</dd>
                  <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={simLodged}
                onClick={() => setSimLodged(true)}
              >
                <FileCheck2 size={16} />
                {simLodged ? "Simulated lodgement recorded" : "Mark as prepared (simulated)"}
              </button>
              <p className="text-xs text-slate-500">
                Does not file with the ATO. Use this to practise the BAS flow in the demo.
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="font-semibold text-white">Recent periods</h2>
              <p className="text-xs text-slate-400">
                Sample quarter history — statuses are demo labels, not ATO lodgement receipts.
              </p>
            </div>
            <ul className="divide-y divide-white/10 text-sm">
              {basPeriods.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{p.label}</p>
                    <p className="text-xs text-slate-400">
                      {p.id === "q1-26" && simLodged
                        ? "Simulated lodgement — for your records only"
                        : `${p.status} · due ${formatDateAU(p.due)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-100">{formatAUD(p.netGst)}</p>
                    <p className="text-[11px] text-slate-500">Net GST preview</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            Need a wider view?{" "}
            <Link href="/demo/reports" className="font-semibold text-brand-300 hover:underline">
              Open Reports
            </Link>{" "}
            for profit &amp; loss and balance sheet previews (also not ATO-lodged).
          </p>
        </>
      ) : (
        <EmptyState
          icon={Calculator}
          title="No BAS draft figures yet"
          description="Blank ledger — draft GST on Income / GST on Expenses numbers appear once you have sales and purchase activity. GST Free lines stay out of the GST boxes. The due-date calendar above still applies for planning. Lodgement stays simulated."
          showExploreSample
          actions={[
            { label: "Create mixed-tax invoice", href: "/demo/invoices?mixed=1" },
            { label: "Create mixed-tax bill", href: "/demo/bills?mixed=1" },
            { label: "View reports", href: "/demo/reports" },
            { label: "Back to overview", href: "/demo" },
          ]}
          hint="Sample Jul–Sep draft figures are in the Harbour & Co guest demo."
        />
      )}
    </div>
  );
}
