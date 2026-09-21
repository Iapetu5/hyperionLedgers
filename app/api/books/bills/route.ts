import { NextResponse } from "next/server";
import { createBillServer, listBillsServer } from "@/lib/server-books";
import { booksListError, booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const result = await listBillsServer();
  if ("error" in result) return booksListError(result);
  return NextResponse.json({ configured: true, bills: result.bills });
}

export async function POST(req: Request) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof createBillServer>[0];
  const result = await createBillServer(body);
  if ("error" in result) return booksWriteError(result);
  return NextResponse.json({ bill: result });
}
