/** AU display helpers — amounts and calendar dates for the HyperionLedgers demo. */

/** Product calendar for overdue / expiry / issue defaults (AU bookkeeping story). */
export const DEMO_CALENDAR_TZ = "Australia/Sydney";

export function formatAUD(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(abs);
  return amount < 0 ? `−${formatted}` : formatted;
}

export function formatDateAU(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Today's date as YYYY-MM-DD in Australia/Sydney.
 * Overdue / Expired must not flip a day early or late when the host machine is UTC.
 */
export function todayISO(timeZone: string = DEMO_CALENDAR_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Add calendar days to today (Sydney), returning YYYY-MM-DD. */
export function plusDaysISO(days: number, timeZone: string = DEMO_CALENDAR_TZ): string {
  const today = todayISO(timeZone);
  const [y, m, d] = today.split("-").map(Number);
  if (!y || !m || !d) return today;
  // Pure calendar arithmetic via UTC noon — avoids DST wall-clock surprises.
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
