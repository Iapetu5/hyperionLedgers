"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, FileCheck2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { BasDueDates } from "@/components/bas/BasDueDates";
import { formatAUD, formatDateAU } from "@/lib/format";
import { basPeriods, gstBas } from "@/lib/sample-data";
import {
  BAS_DRAFT_STATUS_SIMULATED,
  deriveBasDraftFromDocDates,
  formatBasRelative,
  isISODateInRange,
  isWeekendISO,
  listBlankBasQuarters,
  type BasDraftPeriod,
} from "@/lib/bas-dates";
import {
  EMPTY_REPORT_ROLLUP,
  rollupBlankReports,
  rollupSampleReports,
  type BlankReportRollup,
} from "@/lib/blank-reports";
import { loadUserBills, loadUserInvoices, type UserBill, type UserInvoice } from "@/lib/user-docs";

const SIM_LODGE_KEY = "hl_bas_sim_lodged_v1";

function simLodgeStorageKey(mode: "sample" | "blank", orgKey: string) {
  return `${SIM_LODGE_KEY}:${mode}:${orgKey}`;
}

/**
 * Blank prepared mark only. Harbour sample stays on simLodgeStorageKey
 * ("sample", org) — the single org flag — and never reads or writes this key.
 * The legacy blank flag (`hl_bas_sim_lodged_v1:blank:<org>`, no periodEnd) is
 * not read, so an old single mark cannot make every quarter look prepared.
 */
function blankQuarterLodgeKey(orgKey: string, periodEnd: string) {
  return `${SIM_LODGE_KEY}:blank:${orgKey}:${periodEnd}`;
}

function readSimLodged(key: string): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeSimLodged(key: string, value: boolean) {
  try {
    if (value) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Blank "View quarter" only. Separate from the prepared mark (that one is
 * per periodEnd). Never written for the Harbour sample path.
 */
const VIEW_QUARTER_KEY = "hl_bas_view_quarter_v1";

function viewQuarterStorageKey(orgKey: string) {
  return `${VIEW_QUARTER_KEY}:blank:${orgKey}`;
}

function readViewQuarter(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function writeViewQuarter(key: string, periodEnd: string | null) {
  try {
    if (periodEnd && /^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
      localStorage.setItem(key, periodEnd);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export default function GstBasPage() {
  const { usesSampleData, user } = useAuth();
  const gstOn = user?.gstRegistered !== false;
  const orgKey = user?.email?.trim().toLowerCase() || user?.businessName?.trim() || "guest";
  const mode: "sample" | "blank" = usesSampleData ? "sample" : "blank";
  // null on the sample path — do not persist a viewed quarter onto Harbour.
  const viewQuarterKey = mode === "blank" ? viewQuarterStorageKey(orgKey) : null;

  const [simLodged, setSimLodged] = useState(false);
  const [blankInvoices, setBlankInvoices] = useState<UserInvoice[]>([]);
  const [blankBills, setBlankBills] = useState<UserBill[]>([]);
  const [mounted, setMounted] = useState(false);
  /** Blank mode only. null = follow the latest-document quarter. */
  const [selectedPeriodEnd, setSelectedPeriodEnd] = useState<string | null>(null);

  useEffect(() => {
    if (usesSampleData) return;
    const reload = () => {
      setBlankInvoices(loadUserInvoices());
      setBlankBills(loadUserBills());
    };
    reload();
    window.addEventListener("hl-user-docs-updated", reload);
    window.addEventListener("hl-doc-status", reload);
    return () => {
      window.removeEventListener("hl-user-docs-updated", reload);
      window.removeEventListener("hl-doc-status", reload);
    };
  }, [usesSampleData]);

  function markSimLodged() {
    // Sample: unchanged one-way write to the org-wide key.
    // Blank: one-way write for the quarter on screen only.
    const key =
      mode === "sample"
        ? simLodgeStorageKey("sample", orgKey)
        : viewingPeriodEnd
          ? blankQuarterLodgeKey(orgKey, viewingPeriodEnd)
          : null;
    if (!key) return;
    setSimLodged(true);
    writeSimLodged(key, true);
  }

  function selectBlankQuarter(periodEnd: string) {
    setSelectedPeriodEnd(periodEnd);
    if (viewQuarterKey) writeViewQuarter(viewQuarterKey, periodEnd);
  }

  const blankHasActivity = blankInvoices.length > 0 || blankBills.length > 0;

  const blankDocDates = useMemo(
    () => [
      ...blankInvoices.map((inv) => inv.issueDate),
      ...blankBills.map((bill) => bill.date),
    ],
    [blankInvoices, blankBills],
  );

  // Default stays the AU quarter of the latest invoice / bill date.
  const blankCurrent: BasDraftPeriod | null = useMemo(() => {
    if (usesSampleData || !blankHasActivity) return null;
    return deriveBasDraftFromDocDates(blankDocDates);
  }, [usesSampleData, blankHasActivity, blankDocDates]);

  // Latest-doc quarter, every quarter that actually has docs, plus the previous empty quarter.
  const blankQuarters: BasDraftPeriod[] = useMemo(() => {
    if (usesSampleData || !blankHasActivity) return [];
    return listBlankBasQuarters(blankDocDates);
  }, [usesSampleData, blankHasActivity, blankDocDates]);

  // After the blank list is known: restore the saved periodEnd if it is still
  // listed. If it is gone, clear the key and follow the latest-document quarter.
  // An empty list (loading, or no documents yet) does not count as "gone".
  useLayoutEffect(() => {
    if (!viewQuarterKey || !mounted) return;
    if (blankQuarters.length === 0) return;

    const saved = readViewQuarter(viewQuarterKey);
    if (saved && blankQuarters.some((q) => q.periodEnd === saved)) {
      setSelectedPeriodEnd((current) => (current === saved ? current : saved));
      return;
    }

    if (saved) writeViewQuarter(viewQuarterKey, null);
    setSelectedPeriodEnd((current) => (current === null ? current : null));
  }, [viewQuarterKey, mounted, blankQuarters]);

  const viewingPeriodEnd =
    selectedPeriodEnd && blankQuarters.some((q) => q.periodEnd === selectedPeriodEnd)
      ? selectedPeriodEnd
      : (blankCurrent?.periodEnd ?? null);

  // Sample reads the same single key as before. Blank reads only
  // hl_bas_sim_lodged_v1:blank:<org>:<periodEnd> for the quarter on screen.
  useLayoutEffect(() => {
    setMounted(true);
    if (mode === "sample") {
      setSimLodged(readSimLodged(simLodgeStorageKey("sample", orgKey)));
      return;
    }
    if (!viewingPeriodEnd) {
      setSimLodged(false);
      return;
    }
    setSimLodged(readSimLodged(blankQuarterLodgeKey(orgKey, viewingPeriodEnd)));
  }, [mode, orgKey, viewingPeriodEnd]);

  const blankDraft: BasDraftPeriod | null = useMemo(() => {
    if (!blankCurrent) return null;
    return blankQuarters.find((q) => q.periodEnd === viewingPeriodEnd) ?? blankCurrent;
  }, [blankCurrent, blankQuarters, viewingPeriodEnd]);

  const viewingLatest =
    !blankDraft || !blankCurrent || blankDraft.periodEnd === blankCurrent.periodEnd;

  // Blank GST boxes use the same formulas as reports, limited to the selected AU quarter.
  // Harbour sample stays the full listed-doc roll-up (numbers and period list unchanged).
  const quarterRollup: BlankReportRollup = useMemo(() => {
    if (!blankDraft) return EMPTY_REPORT_ROLLUP;
    const invoices = blankInvoices.filter((inv) =>
      isISODateInRange(inv.issueDate, blankDraft.periodStart, blankDraft.periodEnd),
    );
    const bills = blankBills.filter((bill) =>
      isISODateInRange(bill.date, blankDraft.periodStart, blankDraft.periodEnd),
    );
    return rollupBlankReports(invoices, bills);
  }, [blankDraft, blankInvoices, blankBills]);

  // Sample roll-up is sync (no localStorage) so SSR/client match; blank waits for mount effect.
  const live = usesSampleData ? rollupSampleReports() : quarterRollup;
  const showFigures = usesSampleData || blankHasActivity;
  const gstOnIncome = live.incomeGst;
  const gstOnExpenses = live.expenseGst;
  const netGst = live.netGst;
  const paygWithheld = usesSampleData ? gstBas.paygWithheld : 0;
  const docsOutsideQuarter = usesSampleData
    ? 0
    : blankInvoices.length + blankBills.length - live.invoiceCount - live.billCount;

  const periodLabel = usesSampleData
    ? gstBas.period
    : blankDraft?.periodLabel ?? "—";
  const periodStatus =
    mounted && simLodged
      ? "Simulated lodgement marked — not sent to the ATO"
      : usesSampleData
        ? gstBas.status
        : BAS_DRAFT_STATUS_SIMULATED;
  const draftDueDate = usesSampleData
    ? basPeriods.find((p) => p.id === "q1-26")?.due ?? "2026-10-28"
    : blankDraft?.dueDate;
  const draftRelative =
    blankDraft &&
    formatBasRelative({
      dueDate: blankDraft.dueDate,
      periodEnd: blankDraft.periodEnd,
      isPast: blankDraft.isPastDue,
      isNext: blankDraft.isNext,
    });
  const draftDueWeekend = draftDueDate ? isWeekendISO(draftDueDate) : false;

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

      {showFigures ? (
        <>
          <div className="card p-5">
            {!usesSampleData && blankQuarters.length > 1 && blankDraft && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  View quarter
                </p>
                <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label="BAS quarter">
                  {blankQuarters.map((q) => {
                    const active = q.periodEnd === blankDraft.periodEnd;
                    const isLatest = q.periodEnd === blankCurrent?.periodEnd;
                    return (
                      <button
                        key={q.periodEnd}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => selectBlankQuarter(q.periodEnd)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                          active
                            ? "border-cyan-400/40 bg-cyan-500/15 text-white"
                            : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <span className="block font-semibold">{q.periodLabel}</span>
                        <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-slate-400">
                          {isLatest
                            ? "Latest documents"
                            : q.hasDocuments
                              ? "Has documents"
                              : "No documents"}
                          {active ? " · viewing" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Defaults to the quarter of your latest invoice or bill. A refresh keeps the quarter
                  you last opened in this browser; if that quarter is no longer listed, the draft
                  returns to your latest documents. Only documents dated in the selected quarter change
                  the GST boxes. Simulated — not lodged with the ATO.
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {usesSampleData || viewingLatest ? "Current period draft" : "Selected period draft"}
                </p>
                <h2 className="mt-1 font-semibold text-white">{periodLabel}</h2>
                <p className="text-sm text-slate-300">{periodStatus}</p>
                {draftDueDate && (
                  <p className="mt-2 text-sm text-white/90">
                    Due{" "}
                    <span className="font-semibold text-cyan-200">{formatDateAU(draftDueDate)}</span>
                    {draftRelative ? (
                      <span className="text-slate-400"> · {draftRelative}</span>
                    ) : null}
                  </p>
                )}
                {!usesSampleData && blankDraft && (
                  <p className="mt-1 text-xs text-slate-400">
                    {viewingLatest
                      ? "Period derived from your latest invoice issue / bill dates (demo calendar)."
                      : "Earlier AU quarter on the demo calendar — not the latest-document period."}{" "}
                    Period end {formatDateAU(blankDraft.periodEnd)}. Simulated preview — not lodged
                    with the ATO.
                  </p>
                )}
                {usesSampleData && (
                  <p className="mt-1 text-xs text-slate-400">
                    Harbour sample quarter label — GST boxes still roll up from listed invoices &amp;
                    bills.
                  </p>
                )}
                {draftDueWeekend && (
                  <p className="mt-1 text-[11px] text-amber-200/80">
                    Demo due date falls on a weekend — ATO may allow the next business day (confirm on
                    ato.gov.au).
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-400">Net GST (preview)</p>
                <p className="text-lg font-bold text-white">{formatAUD(netGst)}</p>
                <p className="text-[11px] text-slate-500">
                  {usesSampleData
                    ? "From listed Harbour invoices & bills"
                    : "This quarter only — other dates stay in the ledger"}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              GST amounts below roll up from <strong className="text-slate-300">GST on Income</strong>{" "}
              sales lines and <strong className="text-slate-300">GST on Expenses</strong> purchase
              lines{" "}
              {usesSampleData
                ? "on listed documents."
                : "dated inside this quarter only. Documents from other quarters stay in your ledger and in year-to-date reports, but do not change these draft boxes."}{" "}
              <strong className="text-slate-300">GST Free</strong> income/expense lines do not add to
              these GST boxes.
              {!usesSampleData && (
                <>
                  {" "}
                  Profit &amp; loss is year-to-date across every document, so its GST rows can be
                  higher than this simulated quarter draft.
                </>
              )}
            </p>

            {!usesSampleData &&
              blankDraft &&
              live.invoiceCount === 0 &&
              live.billCount === 0 && (
                <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">No documents in this quarter</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Nothing is dated between {formatDateAU(blankDraft.periodStart)} and{" "}
                    {formatDateAU(blankDraft.periodEnd)}. GST on Income, GST on Expenses, and net GST
                    are $0 for this period. Documents from other quarters stay in the ledger and do
                    not fill these boxes. Simulated preview — not lodged with the ATO.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/demo/invoices?mixed=1" className="btn-primary">
                      Create invoice
                    </Link>
                    <Link href="/demo/bills?mixed=1" className="btn-secondary">
                      Create bill
                    </Link>
                  </div>
                </div>
              )}

            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["GST on Income", gstOnIncome, "Sales lines at GST on Income (10%)"],
                ["GST on Expenses", gstOnExpenses, "Purchase lines at GST on Expenses"],
                [
                  "PAYG withheld",
                  paygWithheld,
                  usesSampleData ? "Payroll preview (demo)" : "Not calculated",
                ],
              ].map(([label, val, hint]) => (
                <div key={String(label)} className="card-inset p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-1 font-semibold text-white">{formatAUD(Number(val))}</dd>
                  <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
                </div>
              ))}
            </dl>

            <p className="mt-3 text-[11px] text-slate-500">
              {live.invoiceCount} invoice{live.invoiceCount === 1 ? "" : "s"} · {live.billCount}{" "}
              bill{live.billCount === 1 ? "" : "s"}{" "}
              {usesSampleData ? "in this roll-up" : "dated in this quarter"}
            </p>
            {docsOutsideQuarter > 0 && (
              <p className="mt-1 text-[11px] text-slate-500">
                {docsOutsideQuarter} document{docsOutsideQuarter === 1 ? "" : "s"} dated outside this
                quarter {docsOutsideQuarter === 1 ? "is" : "are"} left out of these boxes. Simulated
                preview — not lodged with the ATO.
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={mounted && simLodged}
                onClick={markSimLodged}
              >
                <FileCheck2 size={16} />
                {mounted && simLodged ? "Simulated lodgement recorded" : "Mark as prepared (simulated)"}
              </button>
              <p className="text-xs text-slate-500">
                {usesSampleData
                  ? "Does not file with the ATO. Saved in this browser so a refresh keeps the simulated mark."
                  : "Does not file with the ATO. Saved in this browser for this quarter only — other quarters stay unmarked until you prepare them. Simulated — not lodged with the ATO."}
              </p>
            </div>
          </div>

          {usesSampleData ? (
            <div className="card overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3">
                <h2 className="font-semibold text-white">Recent periods</h2>
                <p className="text-xs text-slate-400">
                  Sample quarter history — Q1 matches the listed-doc roll-up above; earlier quarters are
                  demo labels, not ATO lodgement receipts.
                </p>
              </div>
              <ul className="divide-y divide-white/10 text-sm">
                {basPeriods.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{p.label}</p>
                      <p className="text-xs text-slate-400">
                        {p.id === "q1-26" && mounted && simLodged
                          ? "Simulated lodgement — for your records only"
                          : `${p.status} · due ${formatDateAU(p.due)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-100">
                        {formatAUD(p.id === "q1-26" ? netGst : p.netGst)}
                      </p>
                      <p className="text-[11px] text-slate-500">Net GST preview</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="card border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
              Blank ledger — GST on Income, GST on Expenses, and net GST include only invoices and
              bills dated in the selected quarter (the same period as the label above). The draft
              opens on the latest-document quarter, or the listed quarter you last opened in this
              browser. Use View quarter to look at the previous AU quarter and any other quarter that
              has documents. Mark as prepared is stored for the quarter you are viewing — another
              quarter stays unprepared until you mark it. Profit &amp; loss stays year-to-date across all documents, so those GST
              rows can differ. Harbour guest demo keeps its sample
              period list unchanged. Simulated preview — not lodged with the ATO.
            </div>
          )}

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
          description="Blank ledger — create an invoice or bill and this page will show a draft period (from your document dates), due date, and GST on Income / GST on Expenses boxes. GST Free lines stay out of the GST boxes. Lodgement stays simulated — never sent to the ATO."
          showExploreSample
          actions={[
            { label: "Create invoice", href: "/demo/invoices?mixed=1", primary: true },
            { label: "Create bill", href: "/demo/bills?mixed=1" },
            { label: "View reports", href: "/demo/reports" },
            { label: "Back to overview", href: "/demo" },
          ]}
          hint="The due-date calendar above still applies for planning. Harbour guest demo keeps richer sample quarter history."
        />
      )}
    </div>
  );
}
