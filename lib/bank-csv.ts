/** Browser-side bank statement CSV parsing (AU dates & AUD amounts). */

export type ParsedBankRow = {
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number;
  balance?: number;
  rawLine: number;
};

export type ParseBankCsvSkip = {
  line: number;
  reason: string;
};

export type ParseBankCsvResult =
  | { ok: true; rows: ParsedBankRow[]; skipped: ParseBankCsvSkip[] }
  | { ok: false; error: string; skipped?: ParseBankCsvSkip[] };

const DATE_ALIASES = [
  "date",
  "transaction date",
  "tran date",
  "posted",
  "posted date",
  "value date",
  "processed date",
];
const DESC_ALIASES = [
  "description",
  "narrative",
  "narration",
  "details",
  "particulars",
  "memo",
  "payee",
  "transaction description",
  "merchant",
];
const AMOUNT_ALIASES = ["amount", "transaction amount", "value", "aud", "txn amount"];
const DEBIT_ALIASES = ["debit", "debits", "withdrawal", "withdrawals", "money out"];
const CREDIT_ALIASES = ["credit", "credits", "deposit", "deposits", "money in"];
const BALANCE_ALIASES = ["balance", "running balance", "account balance", "available balance"];

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findCol(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normHeader);
  for (const alias of aliases) {
    const i = normalized.indexOf(alias);
    if (i >= 0) return i;
  }
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    // Empty cells must not match (alias.includes("") is always true)
    if (!h || h.length < 2) continue;
    for (const alias of aliases) {
      if (h.includes(alias) || (h.length >= 3 && alias.includes(h))) return i;
    }
  }
  return -1;
}

/** Parse DD/MM/YYYY (also D/M/YYYY) or ISO YYYY-MM-DD → ISO. */
export function parseAuDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const au = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
  if (!au) return null;
  const d = Number(au[1]);
  const m = Number(au[2]);
  const y = Number(au[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Parse AUD: -42.50, ($42.50), $1,234.56, 42.50 CR/DR, (42.50) */
export function parseAudAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  const dr = /\bDR\b/i.test(s);
  const cr = /\bCR\b/i.test(s);
  s = s.replace(/\b(DR|CR)\b/gi, "").trim();
  s = s.replace(/AUD/gi, "").replace(/\$/g, "").replace(/,/g, "").trim();
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1).trim();
  } else if (s.startsWith("+")) {
    s = s.slice(1).trim();
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  let n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (dr) negative = true;
  if (cr) negative = false;
  if (negative) n = -n;
  return Math.round(n * 100) / 100;
}

/** Minimal CSV line split supporting quoted fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function resolveAmount(
  cols: string[],
  amountIdx: number,
  debitIdx: number,
  creditIdx: number
): number | null {
  // Prefer explicit Debit/Credit columns when present (common AU bank exports)
  if (debitIdx >= 0 || creditIdx >= 0) {
    const debitRaw = debitIdx >= 0 ? (cols[debitIdx] ?? "").trim() : "";
    const creditRaw = creditIdx >= 0 ? (cols[creditIdx] ?? "").trim() : "";
    if (debitRaw && creditRaw) {
      const d = parseAudAmount(debitRaw);
      const c = parseAudAmount(creditRaw);
      if (d === null && c === null) return null;
      const debit = d === null ? 0 : Math.abs(d);
      const credit = c === null ? 0 : Math.abs(c);
      return Math.round((credit - debit) * 100) / 100;
    }
    if (debitRaw) {
      const d = parseAudAmount(debitRaw);
      if (d === null) return null;
      return -Math.abs(d);
    }
    if (creditRaw) {
      const c = parseAudAmount(creditRaw);
      if (c === null) return null;
      return Math.abs(c);
    }
  }
  if (amountIdx >= 0) {
    const raw = (cols[amountIdx] ?? "").trim();
    if (raw) return parseAudAmount(raw);
  }
  return null;
}


function looksLikeHeaderLabel(cell: string): boolean {
  const h = normHeader(cell);
  if (!h) return false;
  // Reject values that are already dates or plain amounts
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(h)) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(h)) return false;
  if (/^[\$\(]?[\d,]+(\.\d+)?\)?$/.test(h.replace(/\s/g, ""))) return false;
  return /[a-z]/i.test(h);
}

/** Scan early lines for a real header (AU banks often put account metadata above it). */
function findHeaderLineIndex(lines: string[]): number {
  const maxScan = Math.min(lines.length, 30);
  for (let i = 0; i < maxScan; i++) {
    const headers = splitCsvLine(lines[i]);
    if (headers.length < 2) continue;
    const dateIdx = findCol(headers, DATE_ALIASES);
    const descIdx = findCol(headers, DESC_ALIASES);
    const amountIdx = findCol(headers, AMOUNT_ALIASES);
    const debitIdx = findCol(headers, DEBIT_ALIASES);
    const creditIdx = findCol(headers, CREDIT_ALIASES);
    if (dateIdx < 0 || descIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) continue;
    // Require the matched date/desc cells to look like column titles, not transaction values
    if (!looksLikeHeaderLabel(headers[dateIdx]) || !looksLikeHeaderLabel(headers[descIdx])) continue;
    return i;
  }
  return -1;
}

export function parseBankCsv(text: string): ParseBankCsvResult {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!cleaned) {
    return {
      ok: false,
      error:
        "Nothing was imported. This file is empty. Upload a CSV with date, description and amount columns.",
      skipped: [],
    };
  }

  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      ok: false,
      error:
        "Nothing was imported. This CSV needs a header row and at least one transaction. Download the sample CSV to see the format.",
      skipped: [],
    };
  }

  const headerIdx = findHeaderLineIndex(lines);
  if (headerIdx < 0) {
    return {
      ok: false,
      error:
        "Nothing was imported. Could not find CSV headers. Include date, description, and either amount or debit/credit columns (balance optional). Australian dates: DD/MM/YYYY. Account metadata rows above the header are OK.",
      skipped: [],
    };
  }

  const headers = splitCsvLine(lines[headerIdx]);
  const dateIdx = findCol(headers, DATE_ALIASES);
  const descIdx = findCol(headers, DESC_ALIASES);
  const amountIdx = findCol(headers, AMOUNT_ALIASES);
  const debitIdx = findCol(headers, DEBIT_ALIASES);
  const creditIdx = findCol(headers, CREDIT_ALIASES);
  const balanceIdx = findCol(headers, BALANCE_ALIASES);

  const rows: ParsedBankRow[] = [];
  const skipped: ParseBankCsvSkip[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.every((c) => !c.trim())) continue;
    const dateRaw = cols[dateIdx] ?? "";
    const descRaw = (cols[descIdx] ?? "").trim();
    const date = parseAuDate(dateRaw);
    const amount = resolveAmount(cols, amountIdx, debitIdx, creditIdx);
    if (!date || amount === null || !descRaw) {
      const reasons: string[] = [];
      if (!date) reasons.push("bad/missing date (use DD/MM/YYYY)");
      if (!descRaw) reasons.push("missing description");
      if (amount === null) reasons.push("bad/missing amount (or debit/credit)");
      skipped.push({ line: i + 1, reason: reasons.join("; ") || "invalid row" });
      continue;
    }
    let balance: number | undefined;
    if (balanceIdx >= 0 && cols[balanceIdx]?.trim()) {
      const b = parseAudAmount(cols[balanceIdx]);
      if (b !== null) balance = b;
    }
    rows.push({ date, description: descRaw, amount, balance, rawLine: i + 1 });
  }

  if (rows.length === 0) {
    const hint =
      skipped.length > 0
        ? `Nothing was imported. Every row was skipped: ${skipped
            .slice(0, 4)
            .map((s) => `line ${s.line} (${s.reason})`)
            .join("; ")}${skipped.length > 4 ? "…" : ""}. Use DD/MM/YYYY dates and AUD amounts like -42.50, ($42.50), or separate debit/credit columns.`
        : "Nothing was imported. No transaction rows found in this file.";
    return {
      ok: false,
      error: hint,
      skipped,
    };
  }

  return { ok: true, rows, skipped };
}

/** Inline copy of public/sample-bank-statement.csv — used if fetch fails. */
export const SAMPLE_CSV_TEXT = "date,description,amount,balance\n12/09/2026,OfficeNest Supplies EFT,-412.50,42437.82\n13/09/2026,Client receipt \u2014 Bluegum Dental,2200.00,44637.82\n14/09/2026,Paper & Pixel Print Co,-1265.00,43372.82\n15/09/2026,ATO BAS instalment,($4500.00),38872.82\n16/09/2026,Harbourfront Events deposit,1100.00,39972.82\n17/09/2026,Metro Link Couriers,-88.00,39884.82\n";
export const SAMPLE_CSV_PATH = "/sample-bank-statement.csv";

/** Light starter CSV for blank orgs — no Harbour sample names. */
export const BLANK_SAMPLE_CSV_TEXT = "date,description,amount,balance\n10/09/2026,Office supplies EFT,-89.50,4910.50\n12/09/2026,Client receipt \u2014 Acme Pty Ltd,1320.00,6230.50\n14/09/2026,Internet & phone,-119.00,6111.50\n15/09/2026,Software subscription,-49.00,6062.50\n";
export const BLANK_SAMPLE_CSV_PATH = "/blank-bank-statement.csv";

/** Debit/Credit column layout (common AU bank exports). Served from /public/sample-bank-statement-debit-credit.csv */
export const SAMPLE_DEBIT_CREDIT_CSV_TEXT = "Date,Narrative,Debit,Credit,Balance\n12/09/2026,OfficeNest Supplies EFT,412.50,,42437.82\n13/09/2026,Client receipt \u2014 Bluegum Dental,,2200.00,44637.82\n14/09/2026,Paper & Pixel Print Co,1265.00,,43372.82\n15/09/2026,ATO BAS instalment,4500.00,,38872.82\n16/09/2026,Harbourfront Events deposit,,1100.00,39972.82\n17/09/2026,Metro Link Couriers,88.00,,39884.82\n";
export const SAMPLE_DEBIT_CREDIT_CSV_PATH = "/sample-bank-statement-debit-credit.csv";

/** Blank-org debit/credit starter — generic names only. */
export const BLANK_DEBIT_CREDIT_CSV_TEXT = "Date,Narrative,Debit,Credit,Balance\n10/09/2026,Office supplies EFT,89.50,,4910.50\n12/09/2026,Client receipt \u2014 Acme Pty Ltd,,1320.00,6230.50\n14/09/2026,Internet & phone,119.00,,6111.50\n15/09/2026,Software subscription,49.00,,6062.50\n";
export const BLANK_DEBIT_CREDIT_CSV_PATH = "/blank-bank-statement-debit-credit.csv";
