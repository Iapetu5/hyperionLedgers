/** Browser-local invoices/quotes/bills for blank-ledger demos (not Harbour & Co sample). */

import { formatAUD, todayISO as sydneyTodayISO, plusDaysISO as sydneyPlusDaysISO } from "@/lib/format";


/** Clear label when a guest (or no org) creates a pay link — never Harbour suburb. */
export const GUEST_DEMO_BUSINESS_NAME = "Demo guest business";

/** Xero AU-style line tax: GST 10% vs GST Free (zero). */
export type LineTaxRate = "GST" | "GST-free";

export type UserDocLineItem = {
  description: string;
  qty: number;
  /** Tax-exclusive line total */
  amount: number;
  unitPrice: number;
  /** Xero-style tax rate for this line (defaults to GST when missing on legacy rows) */
  taxRate?: LineTaxRate;
  /** Catalogue product id when line was picked from Products (optional; edit restores picker) */
  productId?: string;
};

export type UserDocLineInput = {
  description: string;
  qty: number;
  /** Tax-exclusive line amount (qty × unit price) */
  amountExGst: number;
  taxRate?: LineTaxRate;
  /** Optional catalogue link — persisted so Edit reopens the product picker */
  productId?: string;
};

export type UserInvoice = {
  id: string;
  contact: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  gst: number;
  status: "Draft" | "Awaiting payment" | "Paid" | "Overdue";
  reference: string;
  recurring: boolean;
  lineItems?: UserDocLineItem[];
  /** Snapshot at create — pay/print stay branded if session changes */
  businessName?: string;
  businessAbn?: string;
};

export type UserQuote = {
  id: string;
  contact: string;
  contactEmail?: string;
  issueDate: string;
  expiryDate: string;
  amount: number;
  gst: number;
  status: "Draft" | "Sent" | "Accepted" | "Declined";
  reference: string;
  lineItems?: UserDocLineItem[];
  businessName?: string;
  businessAbn?: string;
};

export type UserBill = {
  id: string;
  supplier: string;
  date: string;
  dueDate: string;
  amount: number;
  gst: number;
  status: "Awaiting approval" | "Approved" | "Overdue" | "Paid";
  category: string;
  lineItems?: UserDocLineItem[];
  /** Snapshot at create — internal print stays branded if session changes */
  businessName?: string;
  businessAbn?: string;
};

const INV_KEY = "hl_demo_user_invoices_v1";
const QUOTE_KEY = "hl_demo_user_quotes_v1";
const BILL_KEY = "hl_demo_user_bills_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}


function clearPublicDocStatusLocal(kind: "invoice" | "quote", id: string) {
  if (!isBrowser()) return;
  try {
    const key = "hl_demo_public_doc_status_v1";
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, string>;
    const k = `${kind}:${id}`;
    if (!(k in map)) return;
    delete map[k];
    localStorage.setItem(key, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("hl-doc-status", { detail: { map } }));
  } catch {
    /* ignore */
  }
}

/** Sydney calendar YYYY-MM-DD — overdue/expiry match AU demo clock (not host UTC). */
export function todayISO() {
  return sydneyTodayISO();
}

export function plusDaysISO(days: number) {
  return sydneyPlusDaysISO(days);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function lineGstFromEx(amountExGst: number, taxRate: LineTaxRate): number {
  if (taxRate !== "GST") return 0;
  return round2(amountExGst * 0.1);
}

/** Build line items + totals from tax-exclusive lines with Xero-style tax rates. */
export function resolveLineBundle(input: {
  lines?: UserDocLineInput[];
  amount?: number;
  reference?: string;
  defaultDescription?: string;
  /** Fallback tax when a single amount (no lines) is provided — default GST */
  defaultTaxRate?: LineTaxRate;
}):
  | { ok: true; amount: number; gst: number; reference: string; lineItems: UserDocLineItem[]; subtotal: number }
  | { ok: false; error: string } {
  const defaultDesc = input.defaultDescription || "Professional services";
  const defaultTax: LineTaxRate = input.defaultTaxRate === "GST-free" ? "GST-free" : "GST";
  const lines = (input.lines ?? []).filter((l) => {
    const desc = (l.description || "").trim();
    const amt = Number(l.amountExGst);
    return desc || (Number.isFinite(amt) && amt > 0);
  });

  if (lines.length > 0) {
    const built: UserDocLineItem[] = [];
    let subtotal = 0;
    let gst = 0;
    for (const l of lines) {
      const description = (l.description || "").trim() || defaultDesc;
      const qty = Number(l.qty);
      const amountExGst = Number(l.amountExGst);
      const taxRate: LineTaxRate = l.taxRate === "GST-free" ? "GST-free" : "GST";
      if (!Number.isFinite(qty) || qty <= 0) {
        return { ok: false, error: "Each line needs a quantity greater than zero." };
      }
      if (!Number.isFinite(amountExGst) || amountExGst <= 0) {
        return { ok: false, error: "Each line needs an amount greater than zero (tax exclusive)." };
      }
      if (amountExGst > 1_000_000) {
        return { ok: false, error: "A line amount is too large for this demo." };
      }
      const unitPrice = round2(amountExGst / qty);
      const lineGst = lineGstFromEx(amountExGst, taxRate);
      const productId =
        typeof l.productId === "string" && l.productId.trim() ? l.productId.trim() : undefined;
      built.push({
        description,
        qty: round2(qty),
        amount: round2(amountExGst),
        unitPrice,
        taxRate,
        ...(productId ? { productId } : {}),
      });
      subtotal = round2(subtotal + amountExGst);
      gst = round2(gst + lineGst);
    }
    const amount = round2(subtotal + gst);
    if (amount > 1_000_000) return { ok: false, error: "Total is too large for this demo." };
    // Prefer first line description over "N line items" so mixed-tax samples read clearly.
    const reference =
      (input.reference || "").trim() || built[0].description;
    return {
      ok: true,
      amount,
      gst,
      subtotal,
      reference,
      lineItems: built,
    };
  }

  const reference = (input.reference || "").trim() || defaultDesc;
  const amountIn = Number(input.amount);
  if (!Number.isFinite(amountIn) || amountIn <= 0) {
    return { ok: false, error: "Enter an amount greater than zero (tax exclusive), or add line items." };
  }
  if (amountIn > 1_000_000) return { ok: false, error: "Amount is too large for this demo." };
  const exGst = round2(amountIn);
  const gst = lineGstFromEx(exGst, defaultTax);
  const amount = round2(exGst + gst);
  return {
    ok: true,
    amount,
    gst,
    subtotal: exGst,
    reference,
    lineItems: [{ description: reference, qty: 1, amount: exGst, unitPrice: exGst, taxRate: defaultTax }],
  };
}

function loadList<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, rows: T[], event: string) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(event, { detail: { count: rows.length } }));
}

export function loadUserInvoices(): UserInvoice[] {
  return loadList<UserInvoice>(INV_KEY);
}

export function loadUserQuotes(): UserQuote[] {
  return loadList<UserQuote>(QUOTE_KEY);
}

export function loadUserBills(): UserBill[] {
  return loadList<UserBill>(BILL_KEY);
}

export function getUserInvoice(id: string): UserInvoice | null {
  return loadUserInvoices().find((i) => i.id === id) ?? null;
}

export function getUserQuote(id: string): UserQuote | null {
  return loadUserQuotes().find((q) => q.id === id) ?? null;
}

export function getUserBill(id: string): UserBill | null {
  return loadUserBills().find((b) => b.id === id) ?? null;
}

function nextId(prefix: string, existing: { id: string }[]) {
  let max = 0;
  for (const row of existing) {
    const m = row.id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function getAuthOrgHint(): { businessName?: string; abn?: string } | null {
  if (!isBrowser()) return null;
  try {
    const sessionRaw = localStorage.getItem("hl_demo_session_v1");
    const accountsRaw = localStorage.getItem("hl_demo_accounts_v1");
    if (!sessionRaw || !accountsRaw) return null;
    const session = JSON.parse(sessionRaw) as { accountId?: string; email?: string };
    const accounts = JSON.parse(accountsRaw) as Array<{
      id: string;
      email: string;
      businessName?: string;
      abn?: string;
    }>;
    const account =
      accounts.find((a) => a.id === session.accountId) ||
      accounts.find((a) => a.email === session.email);
    if (!account?.businessName) return null;
    return { businessName: account.businessName, abn: account.abn };
  } catch {
    return null;
  }
}

/** Org snapshot or explicit guest demo name — never silent Harbour branding. */
function resolveBusinessSnapshot(): { businessName: string; businessAbn: string } {
  const org = getAuthOrgHint();
  if (org?.businessName) {
    return { businessName: org.businessName, businessAbn: org.abn || "" };
  }
  return { businessName: GUEST_DEMO_BUSINESS_NAME, businessAbn: "" };
}

export function createUserInvoice(input: {
  contact: string;
  amount?: number;
  reference?: string;
  lines?: UserDocLineInput[];
}): UserInvoice | { error: string } {
  const contact = input.contact.trim();
  if (!contact) return { error: "Enter a customer / contact name." };

  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.reference,
    defaultDescription: "Professional services",
  });
  if (!bundle.ok) return { error: bundle.error };

  const existing = loadUserInvoices();
  const biz = resolveBusinessSnapshot();
  const row: UserInvoice = {
    id: nextId("INV-U", existing),
    contact,
    issueDate: todayISO(),
    dueDate: plusDaysISO(14),
    amount: bundle.amount,
    gst: bundle.gst,
    status: "Awaiting payment",
    reference: bundle.reference,
    recurring: false,
    lineItems: bundle.lineItems,
    businessName: biz.businessName,
    businessAbn: biz.businessAbn,
  };
  saveList(INV_KEY, [row, ...existing], "hl-user-docs-updated");
  return row;
}

export function createUserQuote(input: {
  contact: string;
  contactEmail?: string;
  amount?: number;
  reference?: string;
  lines?: UserDocLineInput[];
  status?: UserQuote["status"];
}): UserQuote | { error: string } {
  const contact = input.contact.trim();
  if (!contact) return { error: "Enter a customer / contact name." };

  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.reference,
    defaultDescription: "Professional services",
  });
  if (!bundle.ok) return { error: bundle.error };

  const existing = loadUserQuotes();
  const biz = resolveBusinessSnapshot();
  const row: UserQuote = {
    id: nextId("QU-U", existing),
    contact,
    contactEmail: input.contactEmail?.trim() || undefined,
    issueDate: todayISO(),
    expiryDate: plusDaysISO(14),
    amount: bundle.amount,
    gst: bundle.gst,
    status: input.status === "Draft" ? "Draft" : "Sent",
    reference: bundle.reference,
    lineItems: bundle.lineItems,
    businessName: biz.businessName,
    businessAbn: biz.businessAbn,
  };
  saveList(QUOTE_KEY, [row, ...existing], "hl-user-docs-updated");
  return row;
}

export function createUserBill(input: {
  supplier: string;
  amount?: number;
  category?: string;
  lines?: UserDocLineInput[];
}): UserBill | { error: string } {
  const supplier = input.supplier.trim();
  if (!supplier) return { error: "Enter a supplier name." };

  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.category,
    defaultDescription: "General",
  });
  if (!bundle.ok) return { error: bundle.error };

  const existing = loadUserBills();
  const biz = resolveBusinessSnapshot();
  const row: UserBill = {
    id: nextId("BILL-U", existing),
    supplier,
    date: todayISO(),
    dueDate: plusDaysISO(14),
    amount: bundle.amount,
    gst: bundle.gst,
    status: "Awaiting approval",
    category: bundle.reference,
    lineItems: bundle.lineItems,
    businessName: biz.businessName,
    businessAbn: biz.businessAbn,
  };
  saveList(BILL_KEY, [row, ...existing], "hl-user-docs-updated");
  return row;
}


function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

const INVOICE_STATUSES: UserInvoice["status"][] = ["Draft", "Awaiting payment", "Paid", "Overdue"];
const QUOTE_STATUSES: UserQuote["status"][] = ["Draft", "Sent", "Accepted", "Declined"];
const BILL_STATUSES: UserBill["status"][] = ["Awaiting approval", "Approved", "Overdue", "Paid"];

export function updateUserInvoice(
  id: string,
  input: {
    contact: string;
    amount?: number;
    reference?: string;
    lines?: UserDocLineInput[];
    issueDate?: string;
    dueDate?: string;
    status?: UserInvoice["status"];
  },
): UserInvoice | { error: string } {
  const existing = loadUserInvoices();
  const idx = existing.findIndex((i) => i.id === id);
  if (idx < 0) return { error: "Invoice not found." };
  const contact = input.contact.trim();
  if (!contact) return { error: "Enter a customer / contact name." };

  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.reference,
    defaultDescription: "Professional services",
  });
  if (!bundle.ok) return { error: bundle.error };

  if (input.issueDate !== undefined && !isISODate(input.issueDate)) {
    return { error: "Issue date must be YYYY-MM-DD." };
  }
  if (input.dueDate !== undefined && !isISODate(input.dueDate)) {
    return { error: "Due date must be YYYY-MM-DD." };
  }
  if (input.status !== undefined && !INVOICE_STATUSES.includes(input.status)) {
    return { error: "Invalid invoice status." };
  }

  const prev = existing[idx];
  const row: UserInvoice = {
    ...prev,
    contact,
    amount: bundle.amount,
    gst: bundle.gst,
    reference: bundle.reference,
    lineItems: bundle.lineItems,
    issueDate: input.issueDate ?? prev.issueDate,
    dueDate: input.dueDate ?? prev.dueDate,
    status: input.status ?? prev.status,
  };
  const next = [...existing];
  next[idx] = row;
  saveList(INV_KEY, next, "hl-user-docs-updated");
  return row;
}

export function updateUserQuote(
  id: string,
  input: {
    contact: string;
    contactEmail?: string;
    amount?: number;
    reference?: string;
    lines?: UserDocLineInput[];
    issueDate?: string;
    expiryDate?: string;
    status?: UserQuote["status"];
  },
): UserQuote | { error: string } {
  const existing = loadUserQuotes();
  const idx = existing.findIndex((q) => q.id === id);
  if (idx < 0) return { error: "Quote not found." };
  const contact = input.contact.trim();
  if (!contact) return { error: "Enter a customer / contact name." };

  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.reference,
    defaultDescription: "Professional services",
  });
  if (!bundle.ok) return { error: bundle.error };

  if (input.issueDate !== undefined && !isISODate(input.issueDate)) {
    return { error: "Issue date must be YYYY-MM-DD." };
  }
  if (input.expiryDate !== undefined && !isISODate(input.expiryDate)) {
    return { error: "Expiry date must be YYYY-MM-DD." };
  }
  if (input.status !== undefined && !QUOTE_STATUSES.includes(input.status)) {
    return { error: "Invalid quote status." };
  }

  const prev = existing[idx];
  const row: UserQuote = {
    ...prev,
    contact,
    contactEmail: input.contactEmail !== undefined ? input.contactEmail.trim() || undefined : prev.contactEmail,
    amount: bundle.amount,
    gst: bundle.gst,
    reference: bundle.reference,
    lineItems: bundle.lineItems,
    issueDate: input.issueDate ?? prev.issueDate,
    expiryDate: input.expiryDate ?? prev.expiryDate,
    status: input.status ?? prev.status,
  };
  const next = [...existing];
  next[idx] = row;
  saveList(QUOTE_KEY, next, "hl-user-docs-updated");
  return row;
}

export function setUserInvoiceStatus(
  id: string,
  status: UserInvoice["status"],
): UserInvoice | null {
  if (!INVOICE_STATUSES.includes(status)) return null;
  const existing = loadUserInvoices();
  const idx = existing.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  if (existing[idx].status === status) return existing[idx];
  const row: UserInvoice = { ...existing[idx], status };
  const next = [...existing];
  next[idx] = row;
  saveList(INV_KEY, next, "hl-user-docs-updated");
  return row;
}

export function setUserQuoteStatus(
  id: string,
  status: UserQuote["status"],
): UserQuote | null {
  if (!QUOTE_STATUSES.includes(status)) return null;
  const existing = loadUserQuotes();
  const idx = existing.findIndex((q) => q.id === id);
  if (idx < 0) return null;
  if (existing[idx].status === status) return existing[idx];
  const row: UserQuote = { ...existing[idx], status };
  const next = [...existing];
  next[idx] = row;
  saveList(QUOTE_KEY, next, "hl-user-docs-updated");
  return row;
}

export function setUserBillStatus(
  id: string,
  status: UserBill["status"],
): UserBill | null {
  if (!BILL_STATUSES.includes(status)) return null;
  const existing = loadUserBills();
  const idx = existing.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const row: UserBill = { ...existing[idx], status };
  const next = [...existing];
  next[idx] = row;
  saveList(BILL_KEY, next, "hl-user-docs-updated");
  return row;
}

/** Display status: Paid stays Paid; otherwise past-due unpaid bills show Overdue. */
export function effectiveBillStatus(bill: Pick<UserBill, "status" | "dueDate">): UserBill["status"] {
  if (bill.status === "Paid") return "Paid";
  const today = todayISO();
  if (bill.dueDate < today) return "Overdue";
  if (bill.status === "Overdue") return "Approved";
  return bill.status;
}

/** Display status: Paid stays Paid; Draft stays Draft; otherwise past-due unpaid invoices show Overdue. */
export function effectiveInvoiceStatus(
  inv: Pick<UserInvoice, "status" | "dueDate">,
): UserInvoice["status"] {
  if (inv.status === "Paid") return "Paid";
  if (inv.status === "Draft") return "Draft";
  const today = todayISO();
  if (inv.dueDate < today) return "Overdue";
  if (inv.status === "Overdue") return "Awaiting payment";
  return inv.status;
}

/** Display-only quote status (not stored): Accepted/Declined stick; Draft stays Draft; past expiry → Expired. */
export type QuoteDisplayStatus = UserQuote["status"] | "Expired";

export function effectiveQuoteStatus(
  q: Pick<UserQuote, "status" | "expiryDate">,
): QuoteDisplayStatus {
  if (q.status === "Accepted" || q.status === "Declined") return q.status;
  if (q.status === "Draft") return "Draft";
  const today = todayISO();
  if (q.expiryDate < today) return "Expired";
  return q.status;
}

/**
 * Blank-ledger next-step sentence shared by overview and Ask AI
 * so “what next” cannot disagree with the live overdue / receivables row.
 */
export function blankNextInsight(input: {
  overdueBillAmounts: number[];
  overdueInvoice?: { contact: string; id: string; amount: number };
  quotesAwaiting: number;
  quotesExpired: number;
  receivables: number;
  hasAnyDocs: boolean;
}): string {
  const billCount = input.overdueBillAmounts.length;
  const odBillsTotal = input.overdueBillAmounts.reduce((sum, n) => sum + n, 0);
  const chase = input.overdueInvoice;
  if (billCount > 0 && chase) {
    return `Clear overdue bills (${formatAUD(odBillsTotal)}) and chase ${chase.contact} on ${chase.id}.`;
  }
  if (billCount > 0) {
    return `Clear overdue bills (${formatAUD(odBillsTotal)}) — ${billCount} supplier${billCount === 1 ? "" : "s"} past due.`;
  }
  if (chase) {
    return `Chase ${chase.contact} on overdue ${chase.id} (${formatAUD(chase.amount)}).`;
  }
  if (input.quotesAwaiting > 0) {
    const n = input.quotesAwaiting;
    return `${n} quote${n === 1 ? "" : "s"} awaiting reply — follow up or open the customer link.`;
  }
  if (input.quotesExpired > 0) {
    const n = input.quotesExpired;
    return `${n} expired quote${n === 1 ? "" : "s"} — refresh or archive from Quotes.`;
  }
  if (input.receivables > 0) {
    return `Receivables sit at ${formatAUD(input.receivables)} — share pay links or mark paid when money lands.`;
  }
  if (!input.hasAnyDocs) {
    return "No documents yet — create an invoice, quote, or bill to get the ledger moving.";
  }
  return "You're underway — keep creating invoices, quotes, and bills as you go.";
}

export function updateUserBill(
  id: string,
  input: {
    supplier: string;
    amount?: number;
    category?: string;
    lines?: UserDocLineInput[];
    date?: string;
    dueDate?: string;
    status?: UserBill["status"];
  },
): UserBill | { error: string } {
  const existing = loadUserBills();
  const idx = existing.findIndex((b) => b.id === id);
  if (idx < 0) return { error: "Bill not found." };
  const supplier = input.supplier.trim();
  if (!supplier) return { error: "Enter a supplier name." };

  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.category,
    defaultDescription: "General",
  });
  if (!bundle.ok) return { error: bundle.error };

  if (input.date !== undefined && !isISODate(input.date)) {
    return { error: "Bill date must be YYYY-MM-DD." };
  }
  if (input.dueDate !== undefined && !isISODate(input.dueDate)) {
    return { error: "Due date must be YYYY-MM-DD." };
  }
  if (input.status !== undefined && !BILL_STATUSES.includes(input.status)) {
    return { error: "Invalid bill status." };
  }

  const prev = existing[idx];
  const row: UserBill = {
    ...prev,
    supplier,
    amount: bundle.amount,
    gst: bundle.gst,
    category: bundle.reference,
    lineItems: bundle.lineItems,
    date: input.date ?? prev.date,
    dueDate: input.dueDate ?? prev.dueDate,
    status: input.status ?? prev.status,
  };
  const next = [...existing];
  next[idx] = row;
  saveList(BILL_KEY, next, "hl-user-docs-updated");
  return row;
}

const SAMPLE_BILL_STATUS_KEY = "hl_demo_sample_bill_status_v1";

function loadSampleBillStatusMap(): Record<string, UserBill["status"]> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(SAMPLE_BILL_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, UserBill["status"]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (BILL_STATUSES.includes(v as UserBill["status"])) out[k] = v as UserBill["status"];
    }
    return out;
  } catch {
    return {};
  }
}

export function getSampleBillStatus(
  id: string,
  fallback: UserBill["status"] | string,
): UserBill["status"] | string {
  return loadSampleBillStatusMap()[id] ?? fallback;
}

export function setSampleBillStatus(id: string, status: UserBill["status"]): void {
  if (!isBrowser() || !BILL_STATUSES.includes(status)) return;
  const map = loadSampleBillStatusMap();
  map[id] = status;
  localStorage.setItem(SAMPLE_BILL_STATUS_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("hl-user-docs-updated", { detail: { sampleBill: id, status } }));
}

/** Sample bill row with override + auto Overdue from due date. */
export function effectiveSampleBillStatus(
  id: string,
  fallback: UserBill["status"] | string,
  dueDate: string,
): UserBill["status"] | string {
  const stored = getSampleBillStatus(id, fallback) as UserBill["status"] | string;
  return effectiveBillStatus({ status: stored as UserBill["status"], dueDate });
}

export function deleteUserInvoice(id: string): boolean {
  const existing = loadUserInvoices();
  const next = existing.filter((i) => i.id !== id);
  if (next.length === existing.length) return false;
  saveList(INV_KEY, next, "hl-user-docs-updated");
  clearPublicDocStatusLocal("invoice", id);
  return true;
}

export function deleteUserQuote(id: string): boolean {
  const existing = loadUserQuotes();
  const next = existing.filter((q) => q.id !== id);
  if (next.length === existing.length) return false;
  saveList(QUOTE_KEY, next, "hl-user-docs-updated");
  clearPublicDocStatusLocal("quote", id);
  return true;
}

export function deleteUserBill(id: string): boolean {
  const existing = loadUserBills();
  const next = existing.filter((b) => b.id !== id);
  if (next.length === existing.length) return false;
  saveList(BILL_KEY, next, "hl-user-docs-updated");
  return true;
}

/** Drop browser-local invoices, quotes, and bills so a new blank org starts empty.
 *  Onboarding / first-run only — never expose from Banking or invoice/quote/bill lists.
 */
export function clearUserOrganisationDocs(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(INV_KEY);
    localStorage.removeItem(QUOTE_KEY);
    localStorage.removeItem(BILL_KEY);
    window.dispatchEvent(new CustomEvent("hl-user-docs-updated"));
  } catch {
    /* ignore */
  }
}
