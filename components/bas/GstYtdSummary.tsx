import Link from "next/link";
import { Landmark } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/brand";
import type { AuFinancialYear } from "@/lib/bas-dates";
import { formatAUD } from "@/lib/format";

type GstYtdSummaryProps = {
  fy: AuFinancialYear;
  incomeGst: number;
  expenseGst: number;
  netGst: number;
  invoiceCount: number;
  billCount: number;
};

/**
 * Year-to-date GST practice figure for the current Australian FY (1 Jul – 30 Jun).
 * Display/calc only — HyperionInvoices does not lodge or pay the ATO.
 */
export function GstYtdSummary({
  fy,
  incomeGst,
  expenseGst,
  netGst,
  invoiceCount,
  billCount,
}: GstYtdSummaryProps) {
  const refundable = netGst < 0;
  const netAbs = Math.abs(netGst);
  const netLabel = refundable
    ? "Net GST refundable (YTD)"
    : netGst === 0
      ? "Net GST (YTD)"
      : "Net GST payable (YTD)";
  const atoFraming = refundable
    ? "Practice figure you might get back from the tax office"
    : netGst === 0
      ? "Practice figure — nothing to pay the tax office on this total"
      : "Practice figure you would use when paying the tax office";

  return (
    <section
      id="ytd-gst"
      aria-labelledby="ytd-gst-heading"
      className="card scroll-mt-24 border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/5 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
            <Landmark size={20} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/90">
              {PRODUCT_NAME}
            </p>
            <h2 id="ytd-gst-heading" className="mt-1 text-lg font-bold text-white">
              Year to date — amount to pay the tax office (practice figure)
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Australian financial year {fy.shortLabel} · {fy.rangeLabel} · Sydney dates
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              GST on income collected minus GST credits on expenses, from invoices and bills dated
              in this financial year. {PRODUCT_NAME} does not lodge with the ATO — this is not a
              payment or a lodged BAS.
            </p>
          </div>
        </div>
        <div className="min-w-[10rem] rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{netLabel}</p>
          <p className={`text-2xl font-bold tabular-nums ${refundable ? "text-emerald-200" : "text-white"}`}>
            {formatAUD(netAbs)}
          </p>
          <p className="text-[11px] text-slate-400">
            {refundable ? "refundable (practice)" : netGst === 0 ? "to pay (practice)" : "to pay the ATO (practice)"}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="card-inset p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">GST on income (collected) YTD</dt>
          <dd className="mt-1 font-semibold text-white">{formatAUD(incomeGst)}</dd>
          <p className="mt-1 text-[11px] text-slate-500">Sales lines at GST on Income (10%)</p>
        </div>
        <div className="card-inset p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">GST on expenses (credits) YTD</dt>
          <dd className="mt-1 font-semibold text-white">{formatAUD(expenseGst)}</dd>
          <p className="mt-1 text-[11px] text-slate-500">Purchase lines at GST on Expenses</p>
        </div>
        <div className="card-inset p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">{netLabel}</dt>
          <dd className={`mt-1 font-semibold ${refundable ? "text-emerald-200" : "text-white"}`}>
            {refundable ? `${formatAUD(netAbs)} refundable` : formatAUD(netGst)}
          </dd>
          <p className="mt-1 text-[11px] text-slate-500">{atoFraming}</p>
        </div>
      </dl>

      <p className="mt-3 text-[11px] text-slate-500">
        {invoiceCount} invoice{invoiceCount === 1 ? "" : "s"} · {billCount} bill
        {billCount === 1 ? "" : "s"} dated in this financial year
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        Quarter boxes below stay for the BAS draft. Year to date adds every quarter so far in{" "}
        {fy.shortLabel}.{" "}
        <Link href="#quarter-draft" className="font-semibold text-brand-300 hover:underline">
          Jump to this quarter
        </Link>
        . Practice only — {PRODUCT_NAME} does not lodge with the ATO.
      </p>
    </section>
  );
}
