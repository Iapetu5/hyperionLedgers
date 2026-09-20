/** Demo bank reconciliation transactions (sample + CSV imports + AI categorisation). */

import { ParsedBankRow } from "./bank-csv";
import type { CategorySuggestion, TaxRateCode } from "./chart-of-accounts";

export type BankTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  matched: boolean;
  source: "sample" | "import";
  accountCode?: string;
  accountName?: string;
  taxRate?: TaxRateCode;
  categorisedAt?: string;
};

export const CHEQUE_ACCOUNT_ID = "chk";
/** Blank-org cheque account — CSV imports only, never Harbour sample lines. */
export const BLANK_CHEQUE_ACCOUNT_ID = "blank-chk";

export type BankLedgerMode = "sample" | "blank";

export const sampleBankTransactions: BankTransaction[] = [
  { id: "btx-1", accountId: CHEQUE_ACCOUNT_ID, date: "2026-09-08", description: "Adobe Creative Cloud", amount: -79.99, matched: false, source: "sample" },
  { id: "btx-2", accountId: CHEQUE_ACCOUNT_ID, date: "2026-09-09", description: "Client receipt — Northside Café", amount: 3850.0, matched: false, source: "sample" },
  { id: "btx-3", accountId: CHEQUE_ACCOUNT_ID, date: "2026-09-09", description: "Surry Hills studio rent", amount: -3200.0, matched: false, source: "sample" },
  { id: "btx-4", accountId: CHEQUE_ACCOUNT_ID, date: "2026-09-10", description: "OfficeNest Supplies Pty Ltd", amount: -412.5, matched: false, source: "sample" },
  { id: "btx-5", accountId: CHEQUE_ACCOUNT_ID, date: "2026-09-11", description: "Coastal Yoga retainer", amount: 550.0, matched: false, source: "sample" },
  { id: "btx-6", accountId: CHEQUE_ACCOUNT_ID, date: "2026-09-12", description: "Telstra Business", amount: -189.0, matched: false, source: "sample" },
  { id: "btx-7", accountId: CHEQUE_ACCOUNT_ID, date: "2026-09-14", description: "Square POS settlement", amount: 642.3, matched: false, source: "sample" },
];

const IMPORT_KEY = "hl_demo_bank_txns_v1";
const BLANK_IMPORT_KEY = "hl_demo_blank_bank_txns_v1";
const BLANK_OPENING_KEY = "hl_demo_blank_opening_v1";
const CAT_KEY = "hl_demo_bank_cats_v1";
/** Blank-org category overrides stay separate from Harbour sample overrides. */
const BLANK_CAT_KEY = "hl_demo_blank_bank_cats_v1";

type CatOverride = {
  accountCode: string;
  accountName: string;
  taxRate: TaxRateCode;
  matched: boolean;
  categorisedAt: string;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function importKeyFor(mode: BankLedgerMode) {
  return mode === "blank" ? BLANK_IMPORT_KEY : IMPORT_KEY;
}

function loadImports(mode: BankLedgerMode = "sample"): BankTransaction[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(importKeyFor(mode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BankTransaction[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => t.source === "import");
  } catch {
    return [];
  }
}

function catKeyFor(mode: BankLedgerMode) {
  return mode === "blank" ? BLANK_CAT_KEY : CAT_KEY;
}

function loadCatMap(mode: BankLedgerMode = "sample"): Record<string, CatOverride> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(catKeyFor(mode));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CatOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function applyCats(txns: BankTransaction[], mode: BankLedgerMode): BankTransaction[] {
  const cats = loadCatMap(mode);
  return txns.map((t) => {
    const c = cats[t.id];
    if (!c) return t;
    return {
      ...t,
      accountCode: c.accountCode,
      accountName: c.accountName,
      taxRate: c.taxRate,
      matched: c.matched,
      categorisedAt: c.categorisedAt,
    };
  });
}

export function loadBankTransactions(mode: BankLedgerMode = "sample"): BankTransaction[] {
  const base =
    mode === "blank"
      ? [...loadImports("blank")]
      : [...sampleBankTransactions, ...loadImports("sample")];
  return applyCats(base, mode);
}

function persistImported(all: BankTransaction[], mode: BankLedgerMode = "sample") {
  if (!isBrowser()) return;
  const imported = all
    .filter((t) => t.source === "import")
    .map(({ accountCode: _a, accountName: _n, taxRate: _t, categorisedAt: _c, matched: _m, ...rest }) => ({
      ...rest,
      matched: false,
    }));
  localStorage.setItem(importKeyFor(mode), JSON.stringify(imported));
}

export function appendImportedRows(
  rows: ParsedBankRow[],
  accountId = CHEQUE_ACCOUNT_ID,
  mode: BankLedgerMode = "sample",
): BankTransaction[] {
  const current = loadBankTransactions(mode);
  const stamp = Date.now();
  const keyOf = (date: string, description: string, amount: number) =>
    `${date}|${description}|${amount}`;
  const existing = new Set(current.map((t) => keyOf(t.date, t.description, t.amount)));
  const added: BankTransaction[] = [];
  const prefix = mode === "blank" ? "blank-imp" : "imp";
  for (const r of rows) {
    const k = keyOf(r.date, r.description, r.amount);
    if (existing.has(k)) continue;
    existing.add(k);
    added.push({
      id: `${prefix}-${stamp}-${added.length}`,
      accountId,
      date: r.date,
      description: r.description,
      amount: r.amount,
      balance: r.balance,
      matched: false,
      source: "import" as const,
    });
  }
  if (added.length) {
    persistImported([...current, ...added], mode);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hl-bank-updated", { detail: { imported: added.length, mode } }));
    }
  }
  return loadBankTransactions(mode);
}

function findTxnAcrossModes(txnId: string): BankTransaction | null {
  return (
    loadBankTransactions("blank").find((t) => t.id === txnId) ??
    loadBankTransactions("sample").find((t) => t.id === txnId) ??
    null
  );
}

export function applyCategoryToTransaction(
  txnId: string,
  suggestion: Pick<CategorySuggestion, "accountCode" | "accountName" | "taxRate">,
  opts: { markMatched?: boolean } = { markMatched: true }
): BankTransaction | null {
  const target = findTxnAcrossModes(txnId);
  if (!target) return null;
  if (!isBrowser()) return null;
  const mode: BankLedgerMode = target.accountId === BLANK_CHEQUE_ACCOUNT_ID ? "blank" : "sample";

  const categorisedAt = new Date().toISOString();
  const matched = opts.markMatched !== false;
  const cats = loadCatMap(mode);
  cats[txnId] = {
    accountCode: suggestion.accountCode,
    accountName: suggestion.accountName,
    taxRate: suggestion.taxRate,
    matched,
    categorisedAt,
  };
  localStorage.setItem(catKeyFor(mode), JSON.stringify(cats));

  const updated: BankTransaction = {
    ...target,
    accountCode: suggestion.accountCode,
    accountName: suggestion.accountName,
    taxRate: suggestion.taxRate,
    matched,
    categorisedAt,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hl-bank-updated", { detail: { txnId, updated } }));
  }

  return updated;
}

export function unmatchedForAccount(txns: BankTransaction[], accountId = CHEQUE_ACCOUNT_ID): BankTransaction[] {
  return txns.filter((t) => t.accountId === accountId && !t.matched);
}

export function categorisedForAccount(txns: BankTransaction[], accountId = CHEQUE_ACCOUNT_ID): BankTransaction[] {
  return txns.filter((t) => t.accountId === accountId && t.matched && t.accountCode);
}

/** Remove categorisation so the line returns to unmatched (demo undo). */
export function clearCategoryFromTransaction(txnId: string): BankTransaction | null {
  const target = findTxnAcrossModes(txnId);
  if (!target || !isBrowser()) return null;
  const mode: BankLedgerMode = target.accountId === BLANK_CHEQUE_ACCOUNT_ID ? "blank" : "sample";

  const cats = loadCatMap(mode);
  if (!(txnId in cats) && !target.matched && !target.accountCode) return target;
  delete cats[txnId];
  localStorage.setItem(catKeyFor(mode), JSON.stringify(cats));

  const updated: BankTransaction = {
    ...target,
    matched: false,
    accountCode: undefined,
    accountName: undefined,
    taxRate: undefined,
    categorisedAt: undefined,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hl-bank-updated", { detail: { txnId, cleared: true } }));
  }
  return updated;
}

/** Clear Apply / Ask AI categorisation overrides for one ledger mode. */
export function resetAllCategorisations(mode: BankLedgerMode = "sample"): number {
  if (!isBrowser()) return 0;
  const before = Object.keys(loadCatMap(mode)).length;
  localStorage.removeItem(catKeyFor(mode));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hl-bank-updated", { detail: { resetCats: before } }));
  }
  return before;
}

/** Remove CSV-imported rows (sample lines stay in sample mode). Also drops their cat overrides.
 *  Does not touch blank opening balance — use clearBlankOpeningBalance for that.
 */
export function clearImportedTransactions(mode: BankLedgerMode = "sample"): number {
  if (!isBrowser()) return 0;
  const imported = loadImports(mode);
  const n = imported.length;
  if (!n) return 0;
  const cats = loadCatMap(mode);
  for (const t of imported) delete cats[t.id];
  localStorage.setItem(catKeyFor(mode), JSON.stringify(cats));
  localStorage.removeItem(importKeyFor(mode));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hl-bank-updated", { detail: { clearedImports: n, mode } }),
    );
  }
  return n;
}

/** Opening cash for blank cheque account (browser only). */
export function getBlankOpeningBalance(): number {
  if (!isBrowser()) return 0;
  try {
    const raw = localStorage.getItem(BLANK_OPENING_KEY);
    if (raw == null || raw === "") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  } catch {
    return 0;
  }
}

/** True when the blank org has explicitly saved (or CSV-inferred) an opening — including $0. */
export function hasBlankOpeningBalance(): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = localStorage.getItem(BLANK_OPENING_KEY);
    return raw != null && raw !== "";
  } catch {
    return false;
  }
}

export function setBlankOpeningBalance(amount: number): number {
  if (!isBrowser()) return 0;
  const n = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(n) || Math.abs(n) > 50_000_000) return getBlankOpeningBalance();
  localStorage.setItem(BLANK_OPENING_KEY, String(n));
  window.dispatchEvent(new CustomEvent("hl-bank-updated", { detail: { opening: n, mode: "blank" } }));
  return n;
}

/** Reset blank cheque opening to unset (cash total = movements only). */
export function clearBlankOpeningBalance(): boolean {
  if (!isBrowser()) return false;
  const had = localStorage.getItem(BLANK_OPENING_KEY) != null && localStorage.getItem(BLANK_OPENING_KEY) !== "";
  if (!had) return false;
  localStorage.removeItem(BLANK_OPENING_KEY);
  window.dispatchEvent(new CustomEvent("hl-bank-updated", { detail: { opening: 0, cleared: true, mode: "blank" } }));
  return true;
}

/**
 * Infer opening from the earliest CSV row that carries a running balance:
 * opening ≈ balance_after − amount.
 */
export function inferOpeningFromParsedRows(
  rows: { date: string; amount: number; balance?: number; rawLine?: number }[],
): number | null {
  const withBal = rows
    .filter((r) => r.balance !== undefined && Number.isFinite(r.balance))
    .slice()
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.rawLine ?? 0) - (b.rawLine ?? 0),
    );
  if (!withBal.length) return null;
  const first = withBal[0];
  return Math.round((Number(first.balance) - first.amount) * 100) / 100;
}

/**
 * Applied / categorised blank-cheque line. Same predicate as "Recently categorised":
 * category overlay stored in hl_demo_blank_bank_cats_v1 (matched + account code).
 * Unmatched imports do not move cash. Unmatch / reset drops the overlay so the line drops out.
 */
function isCategorisedBlankMovement(t: BankTransaction): boolean {
  return t.accountId === BLANK_CHEQUE_ACCOUNT_ID && t.matched === true && Boolean(t.accountCode);
}

/** Sum of categorised blank-cheque movements only (signed amounts). Unmatched lines are excluded. */
export function blankChequeMovements(txns: BankTransaction[]): number {
  const movements = txns.reduce((s, t) => {
    if (!isCategorisedBlankMovement(t)) return s;
    const amt = Number(t.amount);
    return Number.isFinite(amt) ? s + amt : s;
  }, 0);
  return Math.round(movements * 100) / 100;
}

/**
 * Blank cheque cash = saved opening + categorised movements.
 * Opening of $0 (key present) and unset (key absent) both contribute 0 here;
 * the card distinguishes them via hasBlankOpeningBalance. Not stored as a second cash figure.
 */
export function blankChequeBalance(txns: BankTransaction[], opening?: number): number {
  const open = opening ?? getBlankOpeningBalance();
  return Math.round((open + blankChequeMovements(txns)) * 100) / 100;
}
