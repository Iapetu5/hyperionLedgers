import type { BooksPersistence } from "@/lib/books-client";

/** Signed-in orgs use Postgres. Only an explicit local backend keeps browser-local copy. */
export function usesServerBooksUi(persistence: BooksPersistence, user: unknown): boolean {
  if (persistence === "local") return false;
  if (persistence === "server") return true;
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
