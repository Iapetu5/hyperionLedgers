/** Calendar dates for books: always YYYY-MM-DD. Postgres `date` columns often arrive as Date. */

const ISO_DAY = /^(\d{4}-\d{2}-\d{2})/;

function isoFromDate(value: Date): string | null {
  if (Number.isNaN(value.getTime())) return null;
  const match = value.toISOString().match(ISO_DAY);
  return match ? match[1] : null;
}

/**
 * Neon/pg `date` values stringify as locale weekday strings ("Mon Sep 21").
 * `String(date).slice(0, 10)` produced that bug. Overdue/expiry compare ISO days.
 */
export function toIsoDate(value: unknown, fallback = ""): string {
  if (value instanceof Date) {
    return isoFromDate(value) ?? fallback;
  }
  if (value && typeof value === "object" && typeof (value as Date).toISOString === "function") {
    try {
      return isoFromDate(value as Date) ?? fallback;
    } catch {
      /* not a real Date */
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const iso = trimmed.match(ISO_DAY);
    if (iso) return iso[1];
    const parsed = new Date(trimmed);
    return isoFromDate(parsed) ?? fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return isoFromDate(new Date(value)) ?? fallback;
  }
  return fallback;
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
