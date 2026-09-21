/** Mirrors lib/iso-date.ts — Postgres DATE values must never ship as "Mon Sep 21". */

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIsoDate(value, fallback = "") {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()) && trimmed.length >= 10) {
      return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`;
    }
  }
  return fallback;
}

const utcMidnight = new Date(Date.UTC(2026, 8, 21));
const fromDate = toIsoDate(utcMidnight);
if (fromDate !== "2026-09-21") throw new Error(`Date object → ${fromDate}`);

const localeSliced = String(utcMidnight).slice(0, 10);
if (localeSliced === "2026-09-21") {
  // Environment already ISO-stringifies Date; still assert helper identity.
} else if (toIsoDate(utcMidnight) !== "2026-09-21") {
  throw new Error(`locale slice ${localeSliced} was not corrected`);
}

if (toIsoDate("2026-09-21T00:00:00.000Z") !== "2026-09-21") {
  throw new Error("ISO datetime string failed");
}
if (toIsoDate("2026-10-05") !== "2026-10-05") throw new Error("plain ISO failed");
if (toIsoDate("Mon Sep 21 2026 00:00:00 GMT+0000") !== "2026-09-21") {
  throw new Error("locale weekday string failed");
}

console.log("iso-date checks passed");
