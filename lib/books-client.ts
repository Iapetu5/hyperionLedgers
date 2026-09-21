/**
 * Client-side books store — uses Postgres APIs when auth persistence is server,
 * otherwise delegates to browser localStorage helpers.
 */

import {
  appendImportedRows as appendImportedRowsLocal,
  applyCategoryToTransaction as applyCategoryToTransactionLocal,
  BLANK_CHEQUE_ACCOUNT_ID,
  clearBlankOpeningBalance as clearBlankOpeningBalanceLocal,
  clearCategoryFromTransaction as clearCategoryFromTransactionLocal,
  clearImportedTransactions as clearImportedTransactionsLocal,
  getBlankOpeningBalance as getBlankOpeningBalanceLocal,
  hasBlankOpeningBalance as hasBlankOpeningBalanceLocal,
  loadBankTransactions as loadBankTransactionsLocal,
  resetAllCategorisations as resetAllCategorisationsLocal,
  setBlankOpeningBalance as setBlankOpeningBalanceLocal,
  type BankLedgerMode,
  type BankTransaction,
} from "@/lib/bank-transactions";
import type { ParsedBankRow } from "@/lib/bank-csv";
import type { CategorySuggestion } from "@/lib/chart-of-accounts";
import {
  createUserProduct as createUserProductLocal,
  deleteUserProduct as deleteUserProductLocal,
  loadUserProducts as loadUserProductsLocal,
  updateUserProduct as updateUserProductLocal,
  SAMPLE_PRODUCTS,
  type Product,
  type ProductTax,
} from "@/lib/products";
import {
  createUserBill as createUserBillLocal,
  createUserInvoice as createUserInvoiceLocal,
  createUserQuote as createUserQuoteLocal,
  deleteUserBill as deleteUserBillLocal,
  deleteUserInvoice as deleteUserInvoiceLocal,
  deleteUserQuote as deleteUserQuoteLocal,
  loadUserBills as loadUserBillsLocal,
  loadUserInvoices as loadUserInvoicesLocal,
  loadUserQuotes as loadUserQuotesLocal,
  setUserBillStatus as setUserBillStatusLocal,
  setUserInvoiceStatus as setUserInvoiceStatusLocal,
  setUserQuoteStatus as setUserQuoteStatusLocal,
  updateUserBill as updateUserBillLocal,
  updateUserInvoice as updateUserInvoiceLocal,
  updateUserQuote as updateUserQuoteLocal,
  type UserBill,
  type UserDocLineInput,
  type UserInvoice,
  type UserQuote,
} from "@/lib/user-docs";

export type BooksPersistence = "server" | "local" | "unknown";

let cachedPersistence: BooksPersistence = "unknown";
let cachedHasAccount = false;
let resolvingPersistence: Promise<BooksPersistence> | null = null;

export function setBooksPersistence(mode: BooksPersistence, opts?: { hasAccount?: boolean }) {
  const prev = cachedPersistence;
  const prevAccount = cachedHasAccount;
  cachedPersistence = mode;
  if (opts && "hasAccount" in opts) cachedHasAccount = Boolean(opts.hasAccount);
  if (typeof window !== "undefined" && (prev !== mode || prevAccount !== cachedHasAccount)) {
    window.dispatchEvent(
      new CustomEvent("hl-books-persistence", { detail: { mode, hasAccount: cachedHasAccount } }),
    );
  }
}

export function getBooksPersistence(): BooksPersistence {
  return cachedPersistence;
}

export function booksModeFromMe(data: {
  persistence?: string | null;
  configured?: boolean;
  account?: unknown | null;
}): { mode: BooksPersistence; hasAccount: boolean } {
  const hasAccount = Boolean(data.account);
  if (data.configured === false || data.persistence === "local") {
    return { mode: "local", hasAccount: false };
  }
  if (data.persistence === "server" || data.configured === true || hasAccount) {
    return { mode: "server", hasAccount };
  }
  return { mode: hasAccount ? "server" : "local", hasAccount };
}

/** Signed-in org with Postgres — never fall back to localStorage for books. */
export function isServerBooksMode() {
  return cachedPersistence === "server" && cachedHasAccount;
}

export async function ensureBooksPersistence(): Promise<BooksPersistence> {
  if (cachedPersistence !== "unknown") return cachedPersistence;
  if (resolvingPersistence) return resolvingPersistence;
  resolvingPersistence = (async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        persistence?: string;
        account?: unknown | null;
      };
      const next = booksModeFromMe(data);
      setBooksPersistence(next.mode, { hasAccount: next.hasAccount });
    } catch {
      setBooksPersistence("local", { hasAccount: false });
    } finally {
      resolvingPersistence = null;
    }
    return cachedPersistence;
  })();
  return resolvingPersistence;
}

async function serverBooksEnabled(): Promise<boolean> {
  await ensureBooksPersistence();
  return isServerBooksMode();
}

function emitBooksUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hl-user-docs-updated"));
  }
}

function emitProductsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hl-products-updated"));
  }
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

async function waitForPublicDoc(kind: "invoice" | "quote", id: string): Promise<void> {
  const path =
    kind === "invoice"
      ? `/api/public/invoice/${encodeURIComponent(id)}`
      : `/api/public/quote/${encodeURIComponent(id)}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await fetch(path, { cache: "no-store", credentials: "include" });
      const data = await readJson<{ doc?: unknown }>(res);
      if (res.ok && data.doc) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
  }
}

async function booksFetch<T>(path: string, init?: RequestInit): Promise<T | { error: string }> {
  const res = await fetch(path, { ...init, cache: "no-store", credentials: "include" });
  const data = await readJson<{ error?: string } & T>(res);
  if (!res.ok) return { error: data.error || "Request failed." };
  return data;
}

export async function loadInvoices(): Promise<UserInvoice[]> {
  if (!(await serverBooksEnabled())) return loadUserInvoicesLocal();
  const data = await booksFetch<{ invoices: UserInvoice[] }>("/api/books/invoices");
  if ("error" in data) return [];
  return data.invoices;
}

export async function createInvoice(
  input: Parameters<typeof createUserInvoiceLocal>[0],
): Promise<UserInvoice | { error: string }> {
  if (!(await serverBooksEnabled())) return createUserInvoiceLocal(input);
  const data = await booksFetch<{ invoice: UserInvoice }>("/api/books/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if ("error" in data) return { error: data.error };
  await waitForPublicDoc("invoice", data.invoice.id);
  emitBooksUpdated();
  return data.invoice;
}

export async function updateInvoice(
  id: string,
  input: Parameters<typeof updateUserInvoiceLocal>[1],
): Promise<UserInvoice | { error: string }> {
  if (!(await serverBooksEnabled())) return updateUserInvoiceLocal(id, input);
  const data = await booksFetch<{ invoice: UserInvoice }>(`/api/books/invoices/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if ("error" in data) return { error: data.error };
  emitBooksUpdated();
  return data.invoice;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  if (!(await serverBooksEnabled())) return deleteUserInvoiceLocal(id);
  const res = await fetch(`/api/books/invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return false;
  emitBooksUpdated();
  return true;
}

export async function setInvoiceStatus(id: string, status: UserInvoice["status"]): Promise<UserInvoice | null> {
  if (!(await serverBooksEnabled())) return setUserInvoiceStatusLocal(id, status);
  const data = await booksFetch<{ invoice: UserInvoice | null }>(
    `/api/books/invoices/${encodeURIComponent(id)}/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if ("error" in data) return null;
  emitBooksUpdated();
  return data.invoice;
}

export async function loadQuotes(): Promise<UserQuote[]> {
  if (!(await serverBooksEnabled())) return loadUserQuotesLocal();
  const data = await booksFetch<{ quotes: UserQuote[] }>("/api/books/quotes");
  if ("error" in data) return [];
  return data.quotes;
}

export async function createQuote(
  input: Parameters<typeof createUserQuoteLocal>[0],
): Promise<UserQuote | { error: string }> {
  if (!(await serverBooksEnabled())) return createUserQuoteLocal(input);
  const data = await booksFetch<{ quote: UserQuote }>("/api/books/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if ("error" in data) return { error: data.error };
  await waitForPublicDoc("quote", data.quote.id);
  emitBooksUpdated();
  return data.quote;
}

export async function updateQuote(
  id: string,
  input: Parameters<typeof updateUserQuoteLocal>[1],
): Promise<UserQuote | { error: string }> {
  if (!(await serverBooksEnabled())) return updateUserQuoteLocal(id, input);
  const data = await booksFetch<{ quote: UserQuote }>(`/api/books/quotes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if ("error" in data) return { error: data.error };
  emitBooksUpdated();
  return data.quote;
}

export async function deleteQuote(id: string): Promise<boolean> {
  if (!(await serverBooksEnabled())) return deleteUserQuoteLocal(id);
  const res = await fetch(`/api/books/quotes/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return false;
  emitBooksUpdated();
  return true;
}

export async function setQuoteStatus(id: string, status: UserQuote["status"]): Promise<UserQuote | null> {
  if (!(await serverBooksEnabled())) return setUserQuoteStatusLocal(id, status);
  const data = await booksFetch<{ quote: UserQuote | null }>(
    `/api/books/quotes/${encodeURIComponent(id)}/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if ("error" in data) return null;
  emitBooksUpdated();
  return data.quote;
}

export async function loadBills(): Promise<UserBill[]> {
  if (!(await serverBooksEnabled())) return loadUserBillsLocal();
  const data = await booksFetch<{ bills: UserBill[] }>("/api/books/bills");
  if ("error" in data) return [];
  return data.bills;
}

export async function createBill(
  input: Parameters<typeof createUserBillLocal>[0],
): Promise<UserBill | { error: string }> {
  if (!(await serverBooksEnabled())) return createUserBillLocal(input);
  const data = await booksFetch<{ bill: UserBill }>("/api/books/bills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if ("error" in data) return { error: data.error };
  emitBooksUpdated();
  return data.bill;
}

export async function updateBill(
  id: string,
  input: Parameters<typeof updateUserBillLocal>[1],
): Promise<UserBill | { error: string }> {
  if (!(await serverBooksEnabled())) return updateUserBillLocal(id, input);
  const data = await booksFetch<{ bill: UserBill }>(`/api/books/bills/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if ("error" in data) return { error: data.error };
  emitBooksUpdated();
  return data.bill;
}

export async function deleteBill(id: string): Promise<boolean> {
  if (!(await serverBooksEnabled())) return deleteUserBillLocal(id);
  const res = await fetch(`/api/books/bills/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return false;
  emitBooksUpdated();
  return true;
}

export async function setBillStatus(id: string, status: UserBill["status"]): Promise<UserBill | null> {
  if (!(await serverBooksEnabled())) return setUserBillStatusLocal(id, status);
  const data = await booksFetch<{ bill: UserBill | null }>(`/api/books/bills/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if ("error" in data) return null;
  emitBooksUpdated();
  return data.bill;
}

export async function loadProducts(): Promise<Product[]> {
  if (!(await serverBooksEnabled())) return loadUserProductsLocal();
  const data = await booksFetch<{ products: Product[] }>("/api/books/products");
  if ("error" in data) return [];
  return data.products;
}

export async function createProduct(input: {
  name: string;
  unitPriceExGst: number;
  tax?: ProductTax;
  code?: string;
  description?: string;
}): Promise<Product | { error: string }> {
  if (!(await serverBooksEnabled())) return createUserProductLocal(input);
  const data = await booksFetch<{ product: Product }>("/api/books/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if ("error" in data) return { error: data.error };
  emitProductsUpdated();
  return data.product;
}

export async function updateProduct(
  id: string,
  input: Parameters<typeof updateUserProductLocal>[1],
): Promise<Product | { error: string }> {
  if (!(await serverBooksEnabled())) return updateUserProductLocal(id, input);
  const data = await booksFetch<{ product: Product }>(`/api/books/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if ("error" in data) return { error: data.error };
  emitProductsUpdated();
  return data.product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (!(await serverBooksEnabled())) return deleteUserProductLocal(id);
  const res = await fetch(`/api/books/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return false;
  emitProductsUpdated();
  return true;
}

type BankPayload = {
  imports: BankTransaction[];
  catOverrides: Record<string, unknown>;
  openingBalance: number | null;
};

async function loadBankPayload(): Promise<BankPayload> {
  const data = await booksFetch<BankPayload>("/api/books/banking");
  if ("error" in data) return { imports: [], catOverrides: {}, openingBalance: null };
  return data;
}

function applyCatsFromPayload(txns: BankTransaction[], cats: Record<string, unknown>): BankTransaction[] {
  return txns.map((t) => {
    const c = cats[t.id] as
      | {
          accountCode?: string;
          accountName?: string;
          taxRate?: string;
          matched?: boolean;
          categorisedAt?: string;
        }
      | undefined;
    if (!c) return t;
    return {
      ...t,
      accountCode: c.accountCode,
      accountName: c.accountName,
      taxRate: c.taxRate as BankTransaction["taxRate"],
      matched: Boolean(c.matched),
      categorisedAt: c.categorisedAt,
    };
  });
}

function stripCatFields(t: BankTransaction): BankTransaction {
  const { accountCode: _a, accountName: _n, taxRate: _t, categorisedAt: _c, matched: _m, ...rest } = t;
  return { ...rest, matched: false };
}

async function saveBankPayload(payload: BankPayload): Promise<void> {
  await booksFetch("/api/books/banking", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hl-bank-updated"));
  }
}

export async function loadBankTransactions(mode: BankLedgerMode = "blank"): Promise<BankTransaction[]> {
  if (!(await serverBooksEnabled()) || mode !== "blank") return loadBankTransactionsLocal(mode);
  const payload = await loadBankPayload();
  return applyCatsFromPayload(payload.imports, payload.catOverrides);
}

export async function appendImportedRows(
  rows: ParsedBankRow[],
  accountId = BLANK_CHEQUE_ACCOUNT_ID,
  mode: BankLedgerMode = "blank",
): Promise<BankTransaction[]> {
  if (!(await serverBooksEnabled()) || mode !== "blank") {
    return appendImportedRowsLocal(rows, accountId, mode);
  }
  const payload = await loadBankPayload();
  const current = applyCatsFromPayload(payload.imports, payload.catOverrides);
  const stamp = Date.now();
  const keyOf = (date: string, description: string, amount: number) => `${date}|${description}|${amount}`;
  const existing = new Set(current.map((t) => keyOf(t.date, t.description, t.amount)));
  const added: BankTransaction[] = [];
  for (const r of rows) {
    const k = keyOf(r.date, r.description, r.amount);
    if (existing.has(k)) continue;
    existing.add(k);
    added.push({
      id: `blank-imp-${stamp}-${added.length}`,
      accountId,
      date: r.date,
      description: r.description,
      amount: r.amount,
      balance: r.balance,
      matched: false,
      source: "import",
    });
  }
  if (added.length) {
    payload.imports = [...payload.imports, ...added.map(stripCatFields)];
    await saveBankPayload(payload);
  }
  return loadBankTransactions("blank");
}

export async function applyCategoryToTransaction(
  txnId: string,
  suggestion: Pick<CategorySuggestion, "accountCode" | "accountName" | "taxRate">,
  opts: { markMatched?: boolean } = { markMatched: true },
): Promise<BankTransaction | null> {
  if (!(await serverBooksEnabled())) return applyCategoryToTransactionLocal(txnId, suggestion, opts);
  const payload = await loadBankPayload();
  const target = applyCatsFromPayload(payload.imports, payload.catOverrides).find((t) => t.id === txnId);
  if (!target) return null;
  payload.catOverrides[txnId] = {
    accountCode: suggestion.accountCode,
    accountName: suggestion.accountName,
    taxRate: suggestion.taxRate,
    matched: opts.markMatched !== false,
    categorisedAt: new Date().toISOString(),
  };
  await saveBankPayload(payload);
  return loadBankTransactions("blank").then((txns) => txns.find((t) => t.id === txnId) ?? null);
}

export async function clearCategoryFromTransaction(txnId: string): Promise<BankTransaction | null> {
  if (!(await serverBooksEnabled())) return clearCategoryFromTransactionLocal(txnId);
  const payload = await loadBankPayload();
  delete payload.catOverrides[txnId];
  await saveBankPayload(payload);
  return loadBankTransactions("blank").then((txns) => txns.find((t) => t.id === txnId) ?? null);
}

export async function resetAllCategorisations(mode: BankLedgerMode = "blank"): Promise<number> {
  if (!(await serverBooksEnabled()) || mode !== "blank") return resetAllCategorisationsLocal(mode);
  const payload = await loadBankPayload();
  const n = Object.keys(payload.catOverrides).length;
  payload.catOverrides = {};
  await saveBankPayload(payload);
  return n;
}

export async function clearImportedTransactions(mode: BankLedgerMode = "blank"): Promise<number> {
  if (!(await serverBooksEnabled()) || mode !== "blank") return clearImportedTransactionsLocal(mode);
  const payload = await loadBankPayload();
  const n = payload.imports.length;
  payload.imports = [];
  for (const id of Object.keys(payload.catOverrides)) {
    if (payload.imports.every((t) => t.id !== id)) {
      // keep overrides for sample ids only — imports cleared
    }
  }
  payload.catOverrides = {};
  await saveBankPayload(payload);
  return n;
}

export async function getBlankOpeningBalance(): Promise<number> {
  if (!(await serverBooksEnabled())) return getBlankOpeningBalanceLocal();
  const payload = await loadBankPayload();
  return payload.openingBalance ?? 0;
}

export async function hasBlankOpeningBalance(): Promise<boolean> {
  if (!(await serverBooksEnabled())) return hasBlankOpeningBalanceLocal();
  const payload = await loadBankPayload();
  return payload.openingBalance != null;
}

export async function setBlankOpeningBalance(amount: number): Promise<number> {
  if (!(await serverBooksEnabled())) return setBlankOpeningBalanceLocal(amount);
  const payload = await loadBankPayload();
  const n = Math.round(Number(amount) * 100) / 100;
  payload.openingBalance = Number.isFinite(n) ? n : 0;
  await saveBankPayload(payload);
  return payload.openingBalance ?? 0;
}

export async function clearBlankOpeningBalance(): Promise<boolean> {
  if (!(await serverBooksEnabled())) return clearBlankOpeningBalanceLocal();
  const payload = await loadBankPayload();
  const had = payload.openingBalance != null;
  payload.openingBalance = null;
  await saveBankPayload(payload);
  return had;
}

export async function loadProductsForMode(usesSampleData: boolean): Promise<Product[]> {
  const user = await loadProducts();
  if (usesSampleData) {
    const sampleIds = new Set(SAMPLE_PRODUCTS.map((p) => p.id));
    const extras = user.filter((p) => !sampleIds.has(p.id));
    return [...SAMPLE_PRODUCTS, ...extras];
  }
  return user;
}

export type { Product, ProductTax };
