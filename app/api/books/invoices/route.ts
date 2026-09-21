import { NextResponse } from "next/server";
import { listInvoicesServer, createInvoiceServer } from "@/lib/server-books";
import { booksListError, booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const result = await listInvoicesServer();
  if ("error" in result) return booksListError(result);
  return NextResponse.json({ configured: true, invoices: result.invoices });
}

export async function POST(req: Request) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof createInvoiceServer>[0];
  const result = await createInvoiceServer(body);
  if ("error" in result) return booksWriteError(result);
  return NextResponse.json({ invoice: result });
}
