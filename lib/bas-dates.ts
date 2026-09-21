/** Australian quarterly BAS due dates (demo — lodgement still simulated). */

import { toIsoDate } from "@/lib/iso-date";

export type BasDueItem = {
  id: string;
  quarterLabel: string;
  periodEnd: string;
  dueDate: string;
  isNext: boolean;
  isPast: boolean;
};

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseISO(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from `from` to `toISO` (negative if past). */
export function daysUntil(toISO: string, from: Date = new Date()): number {
  const a = startOfDay(from).getTime();
  const b = parseISO(toISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Plain-English relative due messaging for the BAS calendar.
 * Always demo-oriented — not an ATO lodgement status.
 */
export function formatBasRelative(
  item: Pick<BasDueItem, "dueDate" | "periodEnd" | "isPast" | "isNext">,
  referenceDate: Date = new Date(),
): string {
  const dueIn = daysUntil(item.dueDate, referenceDate);
  const periodIn = daysUntil(item.periodEnd, referenceDate);

  if (dueIn < 0) {
    const overdue = Math.abs(dueIn);
    return overdue === 1 ? "1 day past due date (demo calendar)" : `${overdue} days past due date (demo calendar)`;
  }
  if (dueIn === 0) return "Due today (demo calendar)";
  if (item.isNext && periodIn > 0) {
    return `Period ends in ${periodIn} day${periodIn === 1 ? "" : "s"} · due in ${dueIn} days`;
  }
  if (item.isNext && periodIn === 0) {
    return `Period ends today · due in ${dueIn} days`;
  }
  if (item.isNext && periodIn < 0) {
    return dueIn === 1 ? "Next due tomorrow" : `Next due in ${dueIn} days`;
  }
  return dueIn === 1 ? "Due tomorrow" : `Due in ${dueIn} days`;
}

const QUARTERS = [
  { endM: 9, endD: 30, dueM: 10, dueD: 28, dueYOffset: 0, startLabel: (y: number) => `1 Jul ${y} – 30 Sep ${y}` },
  { endM: 12, endD: 31, dueM: 2, dueD: 28, dueYOffset: 1, startLabel: (y: number) => `1 Oct ${y} – 31 Dec ${y}` },
  { endM: 3, endD: 31, dueM: 5, dueD: 28, dueYOffset: 0, startLabel: (y: number) => `1 Jan ${y} – 31 Mar ${y}` },
  { endM: 6, endD: 30, dueM: 7, dueD: 28, dueYOffset: 0, startLabel: (y: number) => `1 Apr ${y} – 30 Jun ${y}` },
];

export function getBasDueDates(referenceDate: Date = new Date()): BasDueItem[] {
  const y = referenceDate.getFullYear();
  const today = startOfDay(referenceDate);
  const items: BasDueItem[] = [];
  for (const year of [y - 1, y, y + 1]) {
    for (const q of QUARTERS) {
      const periodEnd = iso(year, q.endM, q.endD);
      const dueDate = iso(year + q.dueYOffset, q.dueM, q.dueD);
      items.push({
        id: periodEnd,
        quarterLabel: q.startLabel(year),
        periodEnd,
        dueDate,
        isPast: parseISO(dueDate) < today,
        isNext: false,
      });
    }
  }
  const seen = new Set<string>();
  const unique = items
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const next = unique.find((i) => !i.isPast);
  if (next) next.isNext = true;
  const nextIdx = unique.findIndex((i) => i.isNext);
  if (nextIdx === -1) return unique.slice(-4);
  return unique.slice(Math.max(0, nextIdx - 2), Math.max(0, nextIdx - 2) + 5);
}

export function getNextBasDue(referenceDate: Date = new Date()): BasDueItem | null {
  return getBasDueDates(referenceDate).find((i) => i.isNext) ?? null;
}

/**
 * Demo calendar uses the 28th after quarter end. Real ATO due dates can move to the
 * next business day when the 28th is a weekend or public holiday — confirm on ato.gov.au.
 * HyperionInvoices does not look up official ATO schedules for your ABN.
 */
export const BAS_DUE_APPROX_NOTE =
  "Due dates use the 28th of the month after quarter end as a demo approximation. If that day is a weekend or public holiday, the ATO may allow the next business day — confirm on ato.gov.au for your situation. Demo calendar only; not an official ATO schedule.";

/** True when the ISO date falls on Saturday or Sunday (local calendar). */
export function isWeekendISO(isoDate: string): boolean {
  const d = parseISO(isoDate).getDay();
  return d === 0 || d === 6;
}

export type BasDraftPeriod = {
  /** e.g. "1 Jul 2026 – 30 Sep 2026 (Q1)" */
  periodLabel: string;
  /** Inclusive AU quarter start (YYYY-MM-DD) — same quarter as periodLabel / periodEnd. */
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  quarterLabel: string;
  /** How we chose the period — for UI trust copy */
  source: "document-dates" | "calendar-next";
  isPastDue: boolean;
  isNext: boolean;
  /**
   * Set by listBlankBasQuarters. True when at least one supplied document date
   * falls in this quarter. Omitted on the single draft from deriveBasDraftFromDocDates.
   */
  hasDocuments?: boolean;
};

function quarterTag(endM: number): string {
  if (endM === 9) return "Q1";
  if (endM === 12) return "Q2";
  if (endM === 3) return "Q3";
  return "Q4";
}

/** Period start ISO for a quarter ending at endM/endD in `year`. */
function periodStartISO(year: number, endM: number): string {
  if (endM === 9) return iso(year, 7, 1);
  if (endM === 12) return iso(year, 10, 1);
  if (endM === 3) return iso(year, 1, 1);
  return iso(year, 4, 1);
}

function makeQuarterItem(
  year: number,
  q: (typeof QUARTERS)[number],
  referenceDate: Date,
): BasDueItem {
  const today = startOfDay(referenceDate);
  const periodEnd = iso(year, q.endM, q.endD);
  const dueDate = iso(year + q.dueYOffset, q.dueM, q.dueD);
  return {
    id: periodEnd,
    quarterLabel: q.startLabel(year),
    periodEnd,
    dueDate,
    isPast: parseISO(dueDate) < today,
    isNext: false,
  };
}

/**
 * AU GST quarter containing an ISO calendar date (invoice issue / bill date).
 * Uses the same demo due-date calendar as getBasDueDates.
 */
export function getBasQuarterForISO(
  isoDate: string,
  referenceDate: Date = new Date(),
): BasDueItem | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m] = isoDate.split("-").map(Number);
  if (!y || !m) return null;

  // Map calendar month → quarter definition + the year of that quarter's period end.
  let q = QUARTERS[0];
  let periodYear = y;
  if (m >= 7 && m <= 9) {
    q = QUARTERS[0]; // Jul–Sep
    periodYear = y;
  } else if (m >= 10 && m <= 12) {
    q = QUARTERS[1]; // Oct–Dec
    periodYear = y;
  } else if (m >= 1 && m <= 3) {
    q = QUARTERS[2]; // Jan–Mar
    periodYear = y;
  } else {
    q = QUARTERS[3]; // Apr–Jun
    periodYear = y;
  }

  const item = makeQuarterItem(periodYear, q, referenceDate);
  // Mark isNext only when this quarter is the calendar's upcoming due.
  const next = getNextBasDue(referenceDate);
  if (next && next.id === item.id) item.isNext = true;
  return item;
}

function draftLabel(item: BasDueItem): string {
  const endM = Number(item.periodEnd.slice(5, 7));
  return `${item.quarterLabel} (${quarterTag(endM)})`;
}

function draftFromItem(
  item: BasDueItem,
  source: BasDraftPeriod["source"],
): BasDraftPeriod {
  return {
    periodLabel: draftLabel(item),
    periodStart: periodStartForItem(item),
    periodEnd: item.periodEnd,
    dueDate: item.dueDate,
    quarterLabel: item.quarterLabel,
    source,
    isPastDue: item.isPast,
    isNext: item.isNext,
  };
}

/** Inclusive start of the AU quarter `item` already describes (period end is `item.periodEnd`). */
function periodStartForItem(item: BasDueItem): string {
  const y = Number(item.periodEnd.slice(0, 4));
  const endM = Number(item.periodEnd.slice(5, 7));
  return periodStartISO(y, endM);
}

/**
 * Choose a trustworthy draft BAS period for blank-ledger activity.
 * Prefers the AU quarter of the latest invoice issue / bill date; falls back to
 * the demo calendar's next due. Always simulated — never an ATO lodgement claim.
 */
export function deriveBasDraftFromDocDates(
  docDates: string[],
  referenceDate: Date = new Date(),
): BasDraftPeriod {
  const valid = docDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const latest = valid.length > 0 ? valid[valid.length - 1] : null;
  const fromDocs = latest ? getBasQuarterForISO(latest, referenceDate) : null;
  const item = fromDocs ?? getNextBasDue(referenceDate);

  if (!item) {
    // Extremely defensive — calendar always has a next; keep UI usable.
    const y = referenceDate.getFullYear();
    const fallback = makeQuarterItem(y, QUARTERS[0], referenceDate);
    return draftFromItem(fallback, "calendar-next");
  }

  return draftFromItem(item, fromDocs ? "document-dates" : "calendar-next");
}

/** Status line for draft BAS cards — never claims ATO lodgement. */
export const BAS_DRAFT_STATUS_SIMULATED =
  "Draft preview — simulated, not lodged with the ATO";

/**
 * Inclusive YYYY-MM-DD range. Non-ISO dates are outside every window so they
 * cannot inflate a quarter-scoped BAS draft.
 */
export function isISODateInRange(isoDate: string, start: string, end: string): boolean {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : toIsoDate(isoDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
  return day >= start && day <= end;
}

/** Inclusive ISO bounds for the AU GST quarter containing `isoDate`. */
export function getBasPeriodBounds(isoDate: string): { start: string; end: string } | null {
  const item = getBasQuarterForISO(isoDate);
  if (!item) return null;
  const y = Number(item.periodEnd.slice(0, 4));
  const endM = Number(item.periodEnd.slice(5, 7));
  return { start: periodStartISO(y, endM), end: item.periodEnd };
}

/**
 * Standard Australian financial year (1 Jul – 30 Jun) containing an ISO date.
 * Callers should pass a Sydney calendar date (see `todayISO` in format.ts).
 * Used for year-to-date GST practice figures — not an ATO lodgement period.
 */
export type AuFinancialYear = {
  /** Inclusive YYYY-MM-DD (1 Jul of the starting calendar year). */
  start: string;
  /** Inclusive YYYY-MM-DD (30 Jun of the following calendar year). */
  end: string;
  /** Calendar year of the 1 July that opens this FY. */
  startYear: number;
  /** e.g. "2026–27" */
  shortLabel: string;
  /** e.g. "1 Jul 2026 – 30 Jun 2027" */
  rangeLabel: string;
};

export function getAuFinancialYear(isoDate: string): AuFinancialYear | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const y = Number(isoDate.slice(0, 4));
  const m = Number(isoDate.slice(5, 7));
  if (!y || m < 1 || m > 12) return null;
  const startYear = m >= 7 ? y : y - 1;
  const endYear = startYear + 1;
  return {
    start: iso(startYear, 7, 1),
    end: iso(endYear, 6, 30),
    startYear,
    shortLabel: `${startYear}–${String(endYear).slice(-2)}`,
    rangeLabel: `1 Jul ${startYear} – 30 Jun ${endYear}`,
  };
}

/** Fiscal year of the July that starts the AU GST year containing this period end. */
function fiscalYearOfPeriodEnd(year: number, endM: number): number {
  // Sep/Dec end in the FY that started that July. Mar/Jun end in the next calendar year.
  if (endM === 9 || endM === 12) return year;
  return year - 1;
}

function periodEndFromFiscal(fy: number, qIndex: number): string {
  const q = QUARTERS[qIndex];
  const year = q.endM === 9 || q.endM === 12 ? fy : fy + 1;
  return iso(year, q.endM, q.endD);
}

/**
 * Move `delta` AU GST quarters from a quarter period-end (negative = earlier).
 * `periodEnd` must be one of the demo quarter ends (30 Sep, 31 Dec, 31 Mar, 30 Jun).
 */
export function shiftBasPeriodEnd(periodEnd: string, delta: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) || !Number.isInteger(delta)) return null;
  const year = Number(periodEnd.slice(0, 4));
  const endM = Number(periodEnd.slice(5, 7));
  const qIndex = QUARTERS.findIndex((q) => q.endM === endM);
  if (!year || qIndex < 0) return null;
  const linear = fiscalYearOfPeriodEnd(year, endM) * 4 + qIndex + delta;
  const nextFy = Math.floor(linear / 4);
  const nextIdx = ((linear % 4) + 4) % 4;
  return periodEndFromFiscal(nextFy, nextIdx);
}

/** Draft for an exact demo quarter end. Returns null if `periodEnd` is not a quarter end. */
export function basDraftForPeriodEnd(
  periodEnd: string,
  referenceDate: Date = new Date(),
  source: BasDraftPeriod["source"] = "calendar-next",
): BasDraftPeriod | null {
  const item = getBasQuarterForISO(periodEnd, referenceDate);
  if (!item || item.periodEnd !== periodEnd) return null;
  return draftFromItem(item, source);
}

/**
 * Quarters a blank BAS can switch between. Not a full calendar:
 * every quarter that contains a document date, plus the AU quarter immediately
 * before the latest-document quarter (even when that previous quarter is empty).
 * Newest first. The latest-document quarter is the default (same as deriveBasDraftFromDocDates).
 */
export function listBlankBasQuarters(
  docDates: string[],
  referenceDate: Date = new Date(),
): BasDraftPeriod[] {
  const current = deriveBasDraftFromDocDates(docDates, referenceDate);
  const byEnd = new Map<string, BasDraftPeriod>();

  for (const date of docDates) {
    const item = getBasQuarterForISO(date, referenceDate);
    if (!item) continue;
    if (!byEnd.has(item.periodEnd)) {
      byEnd.set(item.periodEnd, { ...draftFromItem(item, "document-dates"), hasDocuments: true });
    }
  }

  if (!byEnd.has(current.periodEnd)) {
    byEnd.set(current.periodEnd, { ...current, hasDocuments: false });
  }

  const prevEnd = shiftBasPeriodEnd(current.periodEnd, -1);
  if (prevEnd && !byEnd.has(prevEnd)) {
    const prev = basDraftForPeriodEnd(prevEnd, referenceDate, "calendar-next");
    if (prev) byEnd.set(prevEnd, { ...prev, hasDocuments: false });
  }

  return Array.from(byEnd.values()).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
}
