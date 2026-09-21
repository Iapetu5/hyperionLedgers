import { NextResponse } from "next/server";
import { createQuoteServer, listQuotesServer } from "@/lib/server-books";
import { booksListError, booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const result = await listQuotesServer();
  if ("error" in result) return booksListError(result);
  return NextResponse.json({ configured: true, quotes: result.quotes });
}

export async function POST(req: Request) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof createQuoteServer>[0];
  const result = await createQuoteServer(body);
  if ("error" in result) return booksWriteError(result);
  return NextResponse.json({ quote: result });
}
