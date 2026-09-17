/** Australian quarterly BAS due dates (demo — lodgement still simulated). */

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
