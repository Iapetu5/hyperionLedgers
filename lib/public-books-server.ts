import { effectiveInvoiceStatus, effectiveQuoteStatus, type UserInvoice, type UserQuote } from "@/lib/user-docs";
import type { PublicInvoice, PublicQuote } from "@/lib/public-docs";
import { getInvoiceServer, getQuoteServer } from "@/lib/server-books";

function mapLines(lineItems: UserInvoice["lineItems"]) {
  return (lineItems ?? []).map((li) => ({
    description: li.description,
    qty: li.qty,
    unitPrice: li.unitPrice,
    amount: li.amount,
    taxRate: li.taxRate,
  }));
}

export function userInvoiceToPublic(inv: UserInvoice): PublicInvoice {
  return {
    kind: "invoice",
    id: inv.id,
    contact: inv.contact,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    amount: inv.amount,
    gst: inv.gst,
    status: effectiveInvoiceStatus(inv),
    reference: inv.reference,
    lineItems: mapLines(inv.lineItems),
    businessName: inv.businessName || "Your organisation",
    businessAbn: inv.businessAbn || "",
    fromUser: true,
  };
}

export function userQuoteToPublic(q: UserQuote): PublicQuote {
  return {
    kind: "quote",
    id: q.id,
    contact: q.contact,
    issueDate: q.issueDate,
    expiryDate: q.expiryDate,
    amount: q.amount,
    gst: q.gst,
    status: effectiveQuoteStatus(q),
    reference: q.reference,
    lineItems: mapLines(q.lineItems),
    businessName: q.businessName || "Your organisation",
    businessAbn: q.businessAbn || "",
    fromUser: true,
  };
}

export async function getPublicInvoiceFromDb(id: string): Promise<PublicInvoice | null> {
  const inv = await getInvoiceServer(id);
  return inv ? userInvoiceToPublic(inv) : null;
}

export async function getPublicQuoteFromDb(id: string): Promise<PublicQuote | null> {
  const q = await getQuoteServer(id);
  return q ? userQuoteToPublic(q) : null;
}
