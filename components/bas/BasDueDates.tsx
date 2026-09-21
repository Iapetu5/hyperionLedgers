"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import {
  BAS_DUE_APPROX_NOTE,
  daysUntil,
  formatBasRelative,
  getBasDueDates,
  getNextBasDue,
  isWeekendISO,
} from "@/lib/bas-dates";
import { formatDateAU } from "@/lib/format";

export function BasDueDates({ compact = false }: { compact?: boolean }) {
  const items = getBasDueDates();
  const next = getNextBasDue();
  const nextDueIn = next ? daysUntil(next.dueDate) : null;
  const nextIsWeekend = next ? isWeekendISO(next.dueDate) : false;

  if (compact) {
    return (
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next BAS due</p>
            {next ? (
              <>
                <p className="mt-1 text-lg font-bold text-white">{formatDateAU(next.dueDate)}</p>
                <p className="text-sm text-slate-300">{next.quarterLabel}</p>
                <p className="mt-1 text-xs font-medium text-cyan-300/90">{formatBasRelative(next)}</p>
                {nextIsWeekend && (
                  <p className="mt-1 text-[11px] text-amber-200/80">
                    Falls on a weekend — ATO may allow the next business day (confirm on ato.gov.au).
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-400">No upcoming due date on the demo calendar</p>
            )}
          </div>
          <Link href="/demo/tax/gst-bas" className="text-sm font-semibold text-brand-300 hover:underline">
            GST &amp; BAS
          </Link>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Demo calendar for your records — lodgement is simulated, not sent to the ATO.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {next && (
        <div className="card border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                <CalendarClock size={20} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/90">Upcoming BAS</p>
                <h3 className="mt-1 text-xl font-bold text-white">{formatDateAU(next.dueDate)}</h3>
                <p className="mt-0.5 text-sm text-slate-300">{next.quarterLabel}</p>
                <p className="mt-2 text-sm font-medium text-white/90">{formatBasRelative(next)}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Period end {formatDateAU(next.periodEnd)} · approximate quarterly due (28th after quarter
                  end)
                </p>
                {nextIsWeekend && (
                  <p className="mt-1 text-xs text-amber-200/90">
                    This demo due date falls on a weekend — the ATO may allow the next business day
                    (confirm on ato.gov.au). Not looked up for your ABN here.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Countdown</p>
              <p className="text-2xl font-bold text-white">
                {nextDueIn === null ? "—" : nextDueIn}
                <span className="ml-1 text-sm font-medium text-slate-400">
                  {nextDueIn === 1 ? "day" : "days"}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">until due date</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            This is a preview calendar for planning. HyperionInvoices does not lodge with the ATO — any
            &ldquo;prepared&rdquo; status below is a simulated lodgement for your records only.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold text-white">BAS due dates</h3>
          <p className="text-xs text-slate-400">
            Australian quarterly calendar (approx. 28th of the month after quarter end). Demo preview —
            not an official ATO schedule for your ABN.
          </p>
        </div>
        <ul className="divide-y divide-white/10">
          {items.map((item) => {
            const weekend = isWeekendISO(item.dueDate);
            return (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${
                  item.isNext ? "bg-brand-500/10" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-white">{item.quarterLabel}</p>
                  <p className="text-xs text-slate-400">Period end {formatDateAU(item.periodEnd)}</p>
                  {item.isNext && (
                    <p className="mt-0.5 text-xs text-cyan-300/90">{formatBasRelative(item)}</p>
                  )}
                  {weekend && (
                    <p className="mt-0.5 text-[11px] text-amber-200/70">Weekend — may shift to next business day</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-200">{formatDateAU(item.dueDate)}</p>
                  {item.isNext && (
                    <span className="inline-block rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                      Next due
                    </span>
                  )}
                  {!item.isNext && item.isPast && (
                    <span className="text-xs text-slate-500">Past (demo)</span>
                  )}
                  {!item.isNext && !item.isPast && (
                    <span className="text-xs text-slate-500">Upcoming</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-white/10 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          {BAS_DUE_APPROX_NOTE}
        </p>
      </div>
    </div>
  );
}
