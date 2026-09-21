import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";

export function booksNotConfigured() {
  return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
}

/** Auth failures are 401 so the client never treats them as an empty ledger. */
export function booksWriteError(result: { error: string }, notFoundStatus = 400) {
  if (result.error === "You need to be signed in.") {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  return NextResponse.json({ error: result.error }, { status: notFoundStatus });
}

export function booksListError(result: { error: string }) {
  return NextResponse.json({ error: result.error }, { status: 401 });
}

export function requireBooksDb() {
  if (!isDbConfigured()) return booksNotConfigured();
  return null;
}
