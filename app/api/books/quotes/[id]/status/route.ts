import { NextResponse } from "next/server";
import { setQuoteStatusServer } from "@/lib/server-books";
import type { UserQuote } from "@/lib/user-docs";
import { booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as { status?: UserQuote["status"] };
  if (!body.status) return NextResponse.json({ error: "Missing status." }, { status: 400 });
  const quote = await setQuoteStatusServer(decodeURIComponent(params.id), body.status);
  if ("error" in quote) return booksWriteError(quote, 404);
  return NextResponse.json({ quote });
}
