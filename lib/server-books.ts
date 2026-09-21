import { randomBytes } from "crypto";
import { db, ensureSchema } from "@/lib/db";
import { getSessionOrg } from "@/lib/server-auth";
import type { PublicAccount } from "@/lib/auth";
import {
  GUEST_DEMO_BUSINESS_NAME,
  resolveLineBundle,
  todayISO,
  plusDaysISO,
  type UserBill,
  type UserDocLineInput,
  type UserDocLineItem,
  type UserInvoice,
  type UserQuote,
} from "@/lib/user-docs";
import type { Product, ProductTax } from "@/lib/products";
import type { BankLedgerMode, BankTransaction } from "@/lib/bank-transactions";

type OrgContext = { orgId: string; account: PublicAccount };

async function requireOrg(): Promise<OrgContext | { error: string }> {
  await ensureSchema();
  const ctx = await getSessionOrg();
  if (!ctx) return { error: "You need to be signed in." };
  return ctx;
}

function businessSnapshot(account: PublicAccount): { businessName: string; businessAbn: string } {
  if (account.businessName && account.businessName !== "Your organisation") {
    return { businessName: account.businessName, businessAbn: account.abn || "" };
  }
  return { businessName: GUEST_DEMO_BUSINESS_NAME, businessAbn: "" };
}

function newDocId(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString("hex")}`;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseLines(raw: unknown): UserDocLineItem[] | undefined {
  if (!raw || !Array.isArray(raw)) return undefined;
  return raw as UserDocLineItem[];
}

function rowToInvoice(row: Record<string, unknown>): UserInvoice {
  return {
    id: String(row.id),
    contact: String(row.contact),
    issueDate: String(row.issue_date).slice(0, 10),
    dueDate: String(row.due_date).slice(0, 10),
    amount: num(row.amount),
    gst: num(row.gst),
    status: row.status as UserInvoice["status"],
    reference: String(row.reference),
    recurring: Boolean(row.recurring),
    lineItems: parseLines(row.line_items),
    businessName: row.business_name ? String(row.business_name) : undefined,
    businessAbn: row.business_abn ? String(row.business_abn) : undefined,
  };
}

function rowToQuote(row: Record<string, unknown>): UserQuote {
  return {
    id: String(row.id),
    contact: String(row.contact),
    contactEmail: row.contact_email ? String(row.contact_email) : undefined,
    issueDate: String(row.issue_date).slice(0, 10),
    expiryDate: String(row.expiry_date).slice(0, 10),
    amount: num(row.amount),
    gst: num(row.gst),
    status: row.status as UserQuote["status"],
    reference: String(row.reference),
    lineItems: parseLines(row.line_items),
    businessName: row.business_name ? String(row.business_name) : undefined,
    businessAbn: row.business_abn ? String(row.business_abn) : undefined,
  };
}

function rowToBill(row: Record<string, unknown>): UserBill {
  return {
    id: String(row.id),
    supplier: String(row.supplier),
    date: String(row.bill_date).slice(0, 10),
    dueDate: String(row.due_date).slice(0, 10),
    amount: num(row.amount),
    gst: num(row.gst),
    status: row.status as UserBill["status"],
    category: String(row.category),
    lineItems: parseLines(row.line_items),
    businessName: row.business_name ? String(row.business_name) : undefined,
    businessAbn: row.business_abn ? String(row.business_abn) : undefined,
  };
}

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    unitPriceExGst: num(row.unit_price_ex_gst),
    tax: (row.tax === "GST-free" ? "GST-free" : "GST") as ProductTax,
    code: row.code ? String(row.code) : undefined,
  };
}

const INVOICE_STATUSES: UserInvoice["status"][] = ["Draft", "Awaiting payment", "Paid", "Overdue"];
const QUOTE_STATUSES: UserQuote["status"][] = ["Draft", "Sent", "Accepted", "Declined"];
const BILL_STATUSES: UserBill["status"][] = ["Awaiting approval", "Approved", "Overdue", "Paid"];

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export async function listInvoicesServer(): Promise<UserInvoice[]> {
  const ctx = await requireOrg();
  if ("error" in ctx) return [];
  const rows = (await db()`
    SELECT * FROM invoices WHERE organisation_id = ${ctx.orgId} ORDER BY created_at DESC
  `) as Record<string, unknown>[];
  return rows.map(rowToInvoice);
}

export async function getInvoiceServer(id: string): Promise<UserInvoice | null> {
  await ensureSchema();
  const rows = (await db()`SELECT * FROM invoices WHERE id = ${id} LIMIT 1`) as Record<string, unknown>[];
  return rows[0] ? rowToInvoice(rows[0]) : null;
}

export async function getInvoiceForOrg(id: string, orgId: string): Promise<UserInvoice | null> {
  await ensureSchema();
  const rows = (await db()`
    SELECT * FROM invoices WHERE id = ${id} AND organisation_id = ${orgId} LIMIT 1
  `) as Record<string, unknown>[];
  return rows[0] ? rowToInvoice(rows[0]) : null;
}

export async function createInvoiceServer(input: {
  contact: string;
  amount?: number;
  reference?: string;
  lines?: UserDocLineInput[];
  issueDate?: string;
  dueDate?: string;
  status?: UserInvoice["status"];
}): Promise<UserInvoice | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const contact = input.contact.trim();
  if (!contact) return { error: "Enter a customer / contact name." };
  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.reference,
    defaultDescription: "Professional services",
  });
  if (!bundle.ok) return { error: bundle.error };
  const biz = businessSnapshot(ctx.account);
  const id = newDocId("INV-U");
  const status = input.status && INVOICE_STATUSES.includes(input.status) ? input.status : "Awaiting payment";
  await db()`
    INSERT INTO invoices (
      id, organisation_id, contact, issue_date, due_date, amount, gst, status, reference,
      recurring, line_items, business_name, business_abn
    ) VALUES (
      ${id}, ${ctx.orgId}, ${contact},
      ${input.issueDate && isISODate(input.issueDate) ? input.issueDate : todayISO()},
      ${input.dueDate && isISODate(input.dueDate) ? input.dueDate : plusDaysISO(14)},
      ${bundle.amount}, ${bundle.gst}, ${status}, ${bundle.reference},
      false, ${JSON.stringify(bundle.lineItems)}, ${biz.businessName}, ${biz.businessAbn}
    )
  `;
  return (await getInvoiceForOrg(id, ctx.orgId))!;
}

export async function updateInvoiceServer(
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
): Promise<UserInvoice | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const existing = await getInvoiceForOrg(id, ctx.orgId);
  if (!existing) return { error: "Invoice not found." };
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
  await db()`
    UPDATE invoices SET
      contact = ${contact},
      amount = ${bundle.amount},
      gst = ${bundle.gst},
      reference = ${bundle.reference},
      line_items = ${JSON.stringify(bundle.lineItems)},
      issue_date = ${input.issueDate ?? existing.issueDate},
      due_date = ${input.dueDate ?? existing.dueDate},
      status = ${input.status ?? existing.status},
      updated_at = now()
    WHERE id = ${id} AND organisation_id = ${ctx.orgId}
  `;
  return (await getInvoiceForOrg(id, ctx.orgId))!;
}

export async function setInvoiceStatusServer(
  id: string,
  status: UserInvoice["status"],
): Promise<UserInvoice | null> {
  const ctx = await requireOrg();
  if ("error" in ctx || !INVOICE_STATUSES.includes(status)) return null;
  await db()`
    UPDATE invoices SET status = ${status}, updated_at = now()
    WHERE id = ${id} AND organisation_id = ${ctx.orgId}
  `;
  return getInvoiceForOrg(id, ctx.orgId);
}

export async function setPublicInvoiceStatusServer(
  id: string,
  status: UserInvoice["status"],
): Promise<UserInvoice | null> {
  await ensureSchema();
  if (!INVOICE_STATUSES.includes(status)) return null;
  await db()`UPDATE invoices SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  return getInvoiceServer(id);
}

export async function deleteInvoiceServer(id: string): Promise<boolean> {
  const ctx = await requireOrg();
  if ("error" in ctx) return false;
  const rows = (await db()`
    DELETE FROM invoices WHERE id = ${id} AND organisation_id = ${ctx.orgId} RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function listQuotesServer(): Promise<UserQuote[]> {
  const ctx = await requireOrg();
  if ("error" in ctx) return [];
  const rows = (await db()`
    SELECT * FROM quotes WHERE organisation_id = ${ctx.orgId} ORDER BY created_at DESC
  `) as Record<string, unknown>[];
  return rows.map(rowToQuote);
}

export async function getQuoteServer(id: string): Promise<UserQuote | null> {
  await ensureSchema();
  const rows = (await db()`SELECT * FROM quotes WHERE id = ${id} LIMIT 1`) as Record<string, unknown>[];
  return rows[0] ? rowToQuote(rows[0]) : null;
}

export async function getQuoteForOrg(id: string, orgId: string): Promise<UserQuote | null> {
  await ensureSchema();
  const rows = (await db()`
    SELECT * FROM quotes WHERE id = ${id} AND organisation_id = ${orgId} LIMIT 1
  `) as Record<string, unknown>[];
  return rows[0] ? rowToQuote(rows[0]) : null;
}

export async function createQuoteServer(input: {
  contact: string;
  contactEmail?: string;
  amount?: number;
  reference?: string;
  lines?: UserDocLineInput[];
  issueDate?: string;
  expiryDate?: string;
  status?: UserQuote["status"];
}): Promise<UserQuote | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const contact = input.contact.trim();
  if (!contact) return { error: "Enter a customer / contact name." };
  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.reference,
    defaultDescription: "Professional services",
  });
  if (!bundle.ok) return { error: bundle.error };
  const biz = businessSnapshot(ctx.account);
  const id = newDocId("QU-U");
  const status = input.status === "Draft" ? "Draft" : input.status === "Sent" ? "Sent" : "Sent";
  await db()`
    INSERT INTO quotes (
      id, organisation_id, contact, contact_email, issue_date, expiry_date, amount, gst, status, reference,
      line_items, business_name, business_abn
    ) VALUES (
      ${id}, ${ctx.orgId}, ${contact}, ${input.contactEmail?.trim() || null},
      ${input.issueDate && isISODate(input.issueDate) ? input.issueDate : todayISO()},
      ${input.expiryDate && isISODate(input.expiryDate) ? input.expiryDate : plusDaysISO(14)},
      ${bundle.amount}, ${bundle.gst}, ${status}, ${bundle.reference},
      ${JSON.stringify(bundle.lineItems)}, ${biz.businessName}, ${biz.businessAbn}
    )
  `;
  return (await getQuoteForOrg(id, ctx.orgId))!;
}

export async function updateQuoteServer(
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
): Promise<UserQuote | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const existing = await getQuoteForOrg(id, ctx.orgId);
  if (!existing) return { error: "Quote not found." };
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
  await db()`
    UPDATE quotes SET
      contact = ${contact},
      contact_email = ${input.contactEmail !== undefined ? input.contactEmail.trim() || null : existing.contactEmail ?? null},
      amount = ${bundle.amount},
      gst = ${bundle.gst},
      reference = ${bundle.reference},
      line_items = ${JSON.stringify(bundle.lineItems)},
      issue_date = ${input.issueDate ?? existing.issueDate},
      expiry_date = ${input.expiryDate ?? existing.expiryDate},
      status = ${input.status ?? existing.status},
      updated_at = now()
    WHERE id = ${id} AND organisation_id = ${ctx.orgId}
  `;
  return (await getQuoteForOrg(id, ctx.orgId))!;
}

export async function setQuoteStatusServer(id: string, status: UserQuote["status"]): Promise<UserQuote | null> {
  const ctx = await requireOrg();
  if ("error" in ctx || !QUOTE_STATUSES.includes(status)) return null;
  await db()`
    UPDATE quotes SET status = ${status}, updated_at = now()
    WHERE id = ${id} AND organisation_id = ${ctx.orgId}
  `;
  return getQuoteForOrg(id, ctx.orgId);
}

export async function setPublicQuoteStatusServer(
  id: string,
  status: UserQuote["status"],
): Promise<UserQuote | null> {
  await ensureSchema();
  if (!QUOTE_STATUSES.includes(status)) return null;
  await db()`UPDATE quotes SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  return getQuoteServer(id);
}

export async function deleteQuoteServer(id: string): Promise<boolean> {
  const ctx = await requireOrg();
  if ("error" in ctx) return false;
  const rows = (await db()`
    DELETE FROM quotes WHERE id = ${id} AND organisation_id = ${ctx.orgId} RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function listBillsServer(): Promise<UserBill[]> {
  const ctx = await requireOrg();
  if ("error" in ctx) return [];
  const rows = (await db()`
    SELECT * FROM bills WHERE organisation_id = ${ctx.orgId} ORDER BY created_at DESC
  `) as Record<string, unknown>[];
  return rows.map(rowToBill);
}

export async function getBillForOrg(id: string, orgId: string): Promise<UserBill | null> {
  await ensureSchema();
  const rows = (await db()`
    SELECT * FROM bills WHERE id = ${id} AND organisation_id = ${orgId} LIMIT 1
  `) as Record<string, unknown>[];
  return rows[0] ? rowToBill(rows[0]) : null;
}

export async function createBillServer(input: {
  supplier: string;
  amount?: number;
  category?: string;
  lines?: UserDocLineInput[];
  date?: string;
  dueDate?: string;
  status?: UserBill["status"];
}): Promise<UserBill | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const supplier = input.supplier.trim();
  if (!supplier) return { error: "Enter a supplier name." };
  const bundle = resolveLineBundle({
    lines: input.lines,
    amount: input.amount,
    reference: input.category,
    defaultDescription: "General",
  });
  if (!bundle.ok) return { error: bundle.error };
  const biz = businessSnapshot(ctx.account);
  const id = newDocId("BILL-U");
  await db()`
    INSERT INTO bills (
      id, organisation_id, supplier, bill_date, due_date, amount, gst, status, category,
      line_items, business_name, business_abn
    ) VALUES (
      ${id}, ${ctx.orgId}, ${supplier},
      ${input.date && isISODate(input.date) ? input.date : todayISO()},
      ${input.dueDate && isISODate(input.dueDate) ? input.dueDate : plusDaysISO(14)},
      ${bundle.amount}, ${bundle.gst},
      ${input.status && BILL_STATUSES.includes(input.status) ? input.status : "Awaiting approval"},
      ${bundle.reference}, ${JSON.stringify(bundle.lineItems)}, ${biz.businessName}, ${biz.businessAbn}
    )
  `;
  return (await getBillForOrg(id, ctx.orgId))!;
}

export async function updateBillServer(
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
): Promise<UserBill | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const existing = await getBillForOrg(id, ctx.orgId);
  if (!existing) return { error: "Bill not found." };
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
  await db()`
    UPDATE bills SET
      supplier = ${supplier},
      amount = ${bundle.amount},
      gst = ${bundle.gst},
      category = ${bundle.reference},
      line_items = ${JSON.stringify(bundle.lineItems)},
      bill_date = ${input.date ?? existing.date},
      due_date = ${input.dueDate ?? existing.dueDate},
      status = ${input.status ?? existing.status},
      updated_at = now()
    WHERE id = ${id} AND organisation_id = ${ctx.orgId}
  `;
  return (await getBillForOrg(id, ctx.orgId))!;
}

export async function setBillStatusServer(id: string, status: UserBill["status"]): Promise<UserBill | null> {
  const ctx = await requireOrg();
  if ("error" in ctx || !BILL_STATUSES.includes(status)) return null;
  await db()`
    UPDATE bills SET status = ${status}, updated_at = now() WHERE id = ${id} AND organisation_id = ${ctx.orgId}
  `;
  return getBillForOrg(id, ctx.orgId);
}

export async function deleteBillServer(id: string): Promise<boolean> {
  const ctx = await requireOrg();
  if ("error" in ctx) return false;
  const rows = (await db()`
    DELETE FROM bills WHERE id = ${id} AND organisation_id = ${ctx.orgId} RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function listProductsServer(): Promise<Product[]> {
  const ctx = await requireOrg();
  if ("error" in ctx) return [];
  const rows = (await db()`
    SELECT * FROM products WHERE organisation_id = ${ctx.orgId} ORDER BY created_at DESC
  `) as Record<string, unknown>[];
  return rows.map(rowToProduct);
}

export async function createProductServer(input: {
  name: string;
  unitPriceExGst: number;
  tax?: ProductTax;
  code?: string;
  description?: string;
}): Promise<Product | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const name = input.name.trim();
  if (!name) return { error: "Enter a product name." };
  const price = Number(input.unitPriceExGst);
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Enter a unit price greater than zero (tax exclusive)." };
  }
  const tax: ProductTax = input.tax === "GST-free" ? "GST-free" : "GST";
  const id = newDocId("PRD-U");
  await db()`
    INSERT INTO products (id, organisation_id, name, description, unit_price_ex_gst, tax, code)
    VALUES (
      ${id}, ${ctx.orgId}, ${name},
      ${(input.description || "").trim() || null},
      ${Math.round(price * 100) / 100}, ${tax}, ${(input.code || "").trim() || null}
    )
  `;
  const rows = (await db()`SELECT * FROM products WHERE id = ${id} LIMIT 1`) as Record<string, unknown>[];
  return rowToProduct(rows[0]);
}

export async function updateProductServer(
  id: string,
  input: {
    name: string;
    unitPriceExGst: number;
    tax?: ProductTax;
    code?: string;
    description?: string;
  },
): Promise<Product | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const name = input.name.trim();
  if (!name) return { error: "Enter a product name." };
  const price = Number(input.unitPriceExGst);
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Enter a unit price greater than zero (tax exclusive)." };
  }
  const tax: ProductTax = input.tax === "GST-free" ? "GST-free" : "GST";
  const rows = (await db()`
    UPDATE products SET
      name = ${name},
      description = ${(input.description || "").trim() || null},
      unit_price_ex_gst = ${Math.round(price * 100) / 100},
      tax = ${tax},
      code = ${(input.code || "").trim() || null},
      updated_at = now()
    WHERE id = ${id} AND organisation_id = ${ctx.orgId}
    RETURNING *
  `) as Record<string, unknown>[];
  if (!rows[0]) return { error: "Product not found." };
  return rowToProduct(rows[0]);
}

export async function deleteProductServer(id: string): Promise<boolean> {
  const ctx = await requireOrg();
  if ("error" in ctx) return false;
  const rows = (await db()`
    DELETE FROM products WHERE id = ${id} AND organisation_id = ${ctx.orgId} RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

type BankDataRow = {
  imports: BankTransaction[];
  catOverrides: Record<string, unknown>;
  openingBalance: number | null;
};

async function loadBankData(orgId: string): Promise<BankDataRow> {
  await ensureSchema();
  const rows = (await db()`
    SELECT imports, cat_overrides, opening_balance FROM org_bank_data WHERE organisation_id = ${orgId} LIMIT 1
  `) as {
    imports: BankTransaction[] | null;
    cat_overrides: Record<string, unknown> | null;
    opening_balance: number | null;
  }[];
  const row = rows[0];
  return {
    imports: Array.isArray(row?.imports) ? row.imports : [],
    catOverrides: row?.cat_overrides && typeof row.cat_overrides === "object" ? row.cat_overrides : {},
    openingBalance: row?.opening_balance ?? null,
  };
}

async function saveBankData(orgId: string, data: BankDataRow): Promise<void> {
  await db()`
    INSERT INTO org_bank_data (organisation_id, imports, cat_overrides, opening_balance, updated_at)
    VALUES (
      ${orgId},
      ${JSON.stringify(data.imports)}::jsonb,
      ${JSON.stringify(data.catOverrides)}::jsonb,
      ${data.openingBalance},
      now()
    )
    ON CONFLICT (organisation_id) DO UPDATE SET
      imports = EXCLUDED.imports,
      cat_overrides = EXCLUDED.cat_overrides,
      opening_balance = EXCLUDED.opening_balance,
      updated_at = now()
  `;
}

export async function getBankDataServer(): Promise<BankDataRow & { error?: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return { imports: [], catOverrides: {}, openingBalance: null, error: ctx.error };
  return loadBankData(ctx.orgId);
}

export async function saveBankImportsServer(imports: BankTransaction[]): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const data = await loadBankData(ctx.orgId);
  data.imports = imports.filter((t) => t.source === "import");
  await saveBankData(ctx.orgId, data);
  return { ok: true };
}

export async function saveBankCatOverridesServer(
  catOverrides: Record<string, unknown>,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const data = await loadBankData(ctx.orgId);
  data.catOverrides = catOverrides;
  await saveBankData(ctx.orgId, data);
  return { ok: true };
}

export async function saveBankOpeningBalanceServer(
  openingBalance: number | null,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx;
  const data = await loadBankData(ctx.orgId);
  data.openingBalance = openingBalance;
  await saveBankData(ctx.orgId, data);
  return { ok: true };
}

export type { BankLedgerMode };
