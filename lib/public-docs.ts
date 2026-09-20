/** Public invoice/quote documents for customer pay pages (demo, no auth). */

import { DEMO_ORG, invoices as sampleInvoices, quotes as sampleQuotes } from "./sample-data";
import {
  GUEST_DEMO_BUSINESS_NAME,
  effectiveInvoiceStatus,
  effectiveQuoteStatus,
  getUserInvoice,
  getUserQuote,
  setUserInvoiceStatus,
  setUserQuoteStatus,
  type LineTaxRate,
  type UserInvoice,
  type UserQuote,
} from "./user-docs";
import { xeroTaxLabel, type ProductTax } from "./products";

export type DocLineItem = {
  description: string;
  qty: number;
  unitPrice: number;
  /** Tax-exclusive line total */
  amount: number;
  /** Xero AU line tax — GST only applies when "GST" */
  taxRate?: LineTaxRate;
};

/** Short Xero label for pay/print tax column. */
export function docLineTaxLabel(taxRate: LineTaxRate | undefined, scope: "income" | "expense" = "income"): string {
  const tax: ProductTax = taxRate === "GST-free" ? "GST-free" : "GST";
  return xeroTaxLabel(tax, scope);
}

/** Compact list/summary label for a document's line tax mix (Xero AU wording). */
export function docTaxTreatmentSummary(
  lineItems: { taxRate?: LineTaxRate | string }[] | undefined,
  gst: number,
  scope: "income" | "expense" = "income",
): string {
  const gstOnly = scope === "expense" ? "GST on Expenses" : "GST on Income";
  const freeOnly = scope === "expense" ? "GST Free Expenses" : "GST Free Income";
  if (!lineItems || lineItems.length === 0) {
    return gst > 0 ? gstOnly : freeOnly;
  }
  let hasGst = false;
  let hasFree = false;
  for (const li of lineItems) {
    if (li.taxRate === "GST-free") hasFree = true;
    else hasGst = true;
  }
  if (hasGst && hasFree) return "Mixed (GST + GST Free)";
  if (hasFree && !hasGst) return freeOnly;
  return gstOnly;
}

export type PublicInvoice = {
  kind: "invoice";
  id: string;
  contact: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  gst: number;
  status: string;
  reference: string;
  lineItems: DocLineItem[];
  businessName: string;
  businessAbn: string;
  /** User-created (blank/sample create) — skip Harbour suburb unless sample */
  fromUser?: boolean;
  suburb?: string;
  state?: string;
  postcode?: string;
};

export type PublicQuote = {
  kind: "quote";
  id: string;
  contact: string;
  issueDate: string;
  expiryDate: string;
  amount: number;
  gst: number;
  status: string;
  reference: string;
  lineItems: DocLineItem[];
  businessName: string;
  businessAbn: string;
  fromUser?: boolean;
  suburb?: string;
  state?: string;
  postcode?: string;
};

const PUBLIC_STATUS_KEY = "hl_demo_public_doc_status_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readOverrides(): Record<string, string> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(PUBLIC_STATUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeOverrides(map: Record<string, string>) {
  if (!isBrowser()) return;
  localStorage.setItem(PUBLIC_STATUS_KEY, JSON.stringify(map));
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("hl-doc-status", { detail: { map } }));
  }
}

export function setPublicDocStatus(kind: "invoice" | "quote", id: string, status: string) {
  const map = readOverrides();
  map[`${kind}:${id}`] = status;
  writeOverrides(map);
  // Keep UserInvoice / UserQuote.status aligned when pay/accept writes an override
  // (sample Harbour ids have no user row — setters no-op).
  if (kind === "invoice") {
    const invStatuses: UserInvoice["status"][] = ["Draft", "Awaiting payment", "Paid", "Overdue"];
    if (invStatuses.includes(status as UserInvoice["status"])) {
      setUserInvoiceStatus(id, status as UserInvoice["status"]);
    }
  } else {
    const quoteStatuses: UserQuote["status"][] = ["Draft", "Sent", "Accepted", "Declined"];
    if (quoteStatuses.includes(status as UserQuote["status"])) {
      setUserQuoteStatus(id, status as UserQuote["status"]);
    }
  }
}

export function getPublicDocStatus(kind: "invoice" | "quote", id: string): string | null {
  return readOverrides()[`${kind}:${id}`] ?? null;
}

function buildLineItems(reference: string, amount: number, gst: number): DocLineItem[] {
  const exGst = Math.round((amount - gst) * 100) / 100;
  const taxRate: LineTaxRate = gst > 0 ? "GST" : "GST-free";
  return [{ description: reference || "Professional services", qty: 1, unitPrice: exGst, amount: exGst, taxRate }];
}

type RawDocLine = {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  taxRate?: LineTaxRate | "GST-free" | string;
};

function mapRawLines(stored: RawDocLine[]): DocLineItem[] {
  return stored.map((li) => {
    const qty = Number.isFinite(li.qty) && li.qty > 0 ? li.qty : 1;
    const amount = Number.isFinite(li.amount) ? li.amount : 0;
    const unit =
      Number.isFinite(li.unitPrice) && li.unitPrice > 0
        ? li.unitPrice
        : amount > 0
          ? Math.round((amount / qty) * 100) / 100
          : 0;
    return {
      description: li.description,
      qty,
      unitPrice: unit,
      amount,
      taxRate: li.taxRate === "GST-free" ? "GST-free" : "GST",
    };
  });
}

function resolveLineItems(
  stored: RawDocLine[] | undefined,
  reference: string,
  amount: number,
  gst: number,
): DocLineItem[] {
  if (stored && stored.length > 0) return mapRawLines(stored);
  return buildLineItems(reference, amount, gst);
}

/** Resolve signed-in org for blank-ledger pay pages (matches lib/auth keys). */
function getAuthOrgHint(): { businessName?: string; abn?: string } | null {
  if (typeof window === "undefined") return null;
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

function resolveUserBusiness(snapshot?: {
  businessName?: string;
  businessAbn?: string;
}): { businessName: string; businessAbn: string } {
  const hint = getAuthOrgHint();
  const named = snapshot?.businessName || hint?.businessName;
  // Guest / no org: never leak Harbour name + Surry Hills on user-created docs
  if (!named || named === DEMO_ORG.name) {
    if (hint?.businessName && hint.businessName !== DEMO_ORG.name) {
      return { businessName: hint.businessName, businessAbn: hint.abn || "" };
    }
    return { businessName: GUEST_DEMO_BUSINESS_NAME, businessAbn: "" };
  }
  return {
    businessName: named,
    businessAbn: snapshot?.businessAbn || hint?.abn || "",
  };
}

/** Sample-only, no localStorage — safe for SSR / matching hydration. */
export function getSsrSafePublicInvoice(id: string): PublicInvoice | null {
  const sample = sampleInvoices.find((i) => i.id === id);
  if (!sample) return null;
  return {
    kind: "invoice",
    id: sample.id,
    contact: sample.contact,
    issueDate: sample.issueDate,
    dueDate: sample.dueDate,
    amount: sample.amount,
    gst: sample.gst,
    status: effectiveInvoiceStatus({ status: sample.status, dueDate: sample.dueDate }),
    reference: sample.reference,
    lineItems: resolveLineItems(
      "lineItems" in sample ? (sample as { lineItems?: RawDocLine[] }).lineItems : undefined,
      sample.reference,
      sample.amount,
      sample.gst,
    ),
    businessName: DEMO_ORG.name,
    businessAbn: DEMO_ORG.abn,
    fromUser: false,
    suburb: DEMO_ORG.suburb,
    state: DEMO_ORG.state,
    postcode: DEMO_ORG.postcode,
  };
}

export function getSsrSafePublicQuote(id: string): PublicQuote | null {
  const sample = sampleQuotes.find((i) => i.id === id);
  if (!sample) return null;
  return {
    kind: "quote",
    id: sample.id,
    contact: sample.contact,
    issueDate: sample.issueDate,
    expiryDate: sample.expiryDate,
    amount: sample.amount,
    gst: sample.gst,
    status: effectiveQuoteStatus({ status: sample.status, expiryDate: sample.expiryDate }),
    reference: sample.reference,
    lineItems: resolveLineItems(
      "lineItems" in sample ? (sample as { lineItems?: RawDocLine[] }).lineItems : undefined,
      sample.reference,
      sample.amount,
      sample.gst,
    ),
    businessName: DEMO_ORG.name,
    businessAbn: DEMO_ORG.abn,
    fromUser: false,
    suburb: DEMO_ORG.suburb,
    state: DEMO_ORG.state,
    postcode: DEMO_ORG.postcode,
  };
}

export function getPublicInvoice(id: string): PublicInvoice | null {
  const sample = sampleInvoices.find((i) => i.id === id);
  const user = sample ? null : getUserInvoice(id);
  const inv = sample ?? user;
  if (!inv) return null;
  const override = getPublicDocStatus("invoice", id);

  let businessName = DEMO_ORG.name;
  let businessAbn = DEMO_ORG.abn;
  let suburb: string | undefined = DEMO_ORG.suburb;
  let state: string | undefined = DEMO_ORG.state;
  let postcode: string | undefined = DEMO_ORG.postcode;

  if (user) {
    const biz = resolveUserBusiness({
      businessName: user.businessName,
      businessAbn: user.businessAbn,
    });
    businessName = biz.businessName;
    businessAbn = biz.businessAbn;
    suburb = undefined;
    state = undefined;
    postcode = undefined;
  }

  const rawStatus = (override ?? inv.status) as UserInvoice["status"];
  // Auto-Overdue from dueDate for user + Harbour samples (Draft/Paid stick; mirror quote Expired).
  const displayStatus = effectiveInvoiceStatus({ status: rawStatus, dueDate: inv.dueDate });

  return {
    kind: "invoice",
    id: inv.id,
    contact: inv.contact,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    amount: inv.amount,
    gst: inv.gst,
    status: displayStatus,
    reference: inv.reference,
    lineItems: resolveLineItems(
      user?.lineItems ??
        ("lineItems" in inv ? (inv as { lineItems?: RawDocLine[] }).lineItems : undefined),
      inv.reference,
      inv.amount,
      inv.gst,
    ),
    businessName,
    businessAbn,
    fromUser: Boolean(user),
    suburb,
    state,
    postcode,
  };
}

export function getPublicQuote(id: string): PublicQuote | null {
  const sample = sampleQuotes.find((i) => i.id === id);
  const user = sample ? null : getUserQuote(id);
  const q = sample ?? user;
  if (!q) return null;
  const override = getPublicDocStatus("quote", id);

  let businessName = DEMO_ORG.name;
  let businessAbn = DEMO_ORG.abn;
  let suburb: string | undefined = DEMO_ORG.suburb;
  let state: string | undefined = DEMO_ORG.state;
  let postcode: string | undefined = DEMO_ORG.postcode;

  if (user) {
    const biz = resolveUserBusiness({
      businessName: user.businessName,
      businessAbn: user.businessAbn,
    });
    businessName = biz.businessName;
    businessAbn = biz.businessAbn;
    suburb = undefined;
    state = undefined;
    postcode = undefined;
  }

  const rawStatus = (override ?? q.status) as UserQuote["status"];
  // Auto-Expired from expiryDate for user + Harbour samples (mirror invoice overdue display).
  const displayStatus = effectiveQuoteStatus({ status: rawStatus, expiryDate: q.expiryDate });

  return {
    kind: "quote",
    id: q.id,
    contact: q.contact,
    issueDate: q.issueDate,
    expiryDate: q.expiryDate,
    amount: q.amount,
    gst: q.gst,
    status: displayStatus,
    reference: q.reference,
    lineItems: resolveLineItems(
      user?.lineItems ??
        ("lineItems" in q ? (q as { lineItems?: RawDocLine[] }).lineItems : undefined),
      q.reference,
      q.amount,
      q.gst,
    ),
    businessName,
    businessAbn,
    fromUser: Boolean(user),
    suburb,
    state,
    postcode,
  };
}

export function publicInvoiceUrl(id: string): string {
  return `/pay/invoice/${encodeURIComponent(id)}`;
}

export function publicQuoteUrl(id: string): string {
  return `/pay/quote/${encodeURIComponent(id)}`;
}

export function getInvoiceStatus(id: string, fallback: string): string {
  return getPublicDocStatus("invoice", id) ?? fallback;
}

export function getQuoteStatus(id: string, fallback: string): string {
  return getPublicDocStatus("quote", id) ?? fallback;
}
