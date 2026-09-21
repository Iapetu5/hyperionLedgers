import type { BooksPersistence } from "@/lib/books-client";

/** Signed-in orgs use Postgres. Guests and explicit local backends keep browser-local copy. */
export function usesServerBooksUi(persistence: BooksPersistence, user: unknown): boolean {
  if (persistence === "local") return false;
  return Boolean(user);
}

export function booksListHint(server: boolean): string {
  return server ? "saved to your organisation" : "browser-local only";
}

export function booksSampleHint(server: boolean): string {
  return server
    ? "sample + your organisation's documents below"
    : "sample + your browser-local creates below";
}

export function booksStoredHint(server: boolean): string {
  return server
    ? "Saved to your organisation · not part of the demo sample"
    : "Stored in this browser · not part of the demo sample";
}

export function booksLedgerBanner(server: boolean): string {
  return server
    ? "Invoices, quotes, and bills are saved to your organisation. No live bank feeds, payments, or ATO lodgement."
    : "Invoices, quotes, and bills you create stay in this browser. No live bank feeds, payments, or ATO lodgement.";
}

export function booksComposerHint(server: boolean, editing: boolean, kind: "invoice" | "quote" | "bill"): string {
  if (editing) {
    if (kind === "invoice") {
      return server
        ? "Same id & pay link · edit dates & status · saved to your organisation"
        : "Same id & pay link · edit dates & status · browser only";
    }
    if (kind === "quote") {
      return server
        ? "Same id & customer link · edit dates & status · saved to your organisation"
        : "Same id & customer link · edit dates & status · browser only";
    }
    return server
      ? "Same id · edit lines, dates & status · saved to your organisation"
      : "Same id · edit lines, dates & status · browser only";
  }
  const lines = "Line amounts before GST · choose GST or GST-free on each line";
  if (kind === "invoice") {
    return server
      ? `${lines} · dates & status · saved to your organisation`
      : `${lines} · dates & status · saved in this browser`;
  }
  if (kind === "quote") {
    return server
      ? `${lines} · issue, expiry & status · saved to your organisation`
      : `${lines} · issue, expiry & status · saved in this browser`;
  }
  return server
    ? `${lines} · due in 14 days · saved to your organisation`
    : `${lines} · due in 14 days`;
}

export function booksDeleteBody(server: boolean, kind: "invoice" | "quote" | "bill", id: string): string {
  const where = server ? "your organisation" : "this browser";
  if (kind === "invoice") {
    return `Removes this invoice from ${where}. Other invoices, quotes, and bills stay. The customer pay link for ${id} will not work after this. Mark paid and Undo paid only change status — they do not delete.`;
  }
  if (kind === "quote") {
    return `Removes this quote from ${where}. Other quotes, invoices, and bills stay. The customer link for ${id} will not work after this.`;
  }
  return `Removes this bill from ${where}. Other bills, invoices, and quotes stay. Approve, Mark paid, and Undo paid only change status — they do not delete.`;
}

export function booksCatalogueHint(server: boolean): string {
  return server
    ? "AU demo · unit price tax-exclusive · Tax maps to GST on Income / GST Free Income · saved to your organisation"
    : "AU demo · unit price tax-exclusive · Tax maps to GST on Income / GST Free Income · browser only";
}

export function booksBankingHint(server: boolean, blank: boolean): string {
  if (!blank) return "Sample balances and browser-side CSV import only — no live bank feeds or APIs.";
  return server
    ? "Organisation cheque account — CSV import is saved to your organisation. No live bank feeds."
    : "Cheque account — browser-side CSV only. No live bank feeds, and demo sample lines stay out of this blank ledger.";
}
