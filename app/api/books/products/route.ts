import { NextResponse } from "next/server";
import { createProductServer, listProductsServer } from "@/lib/server-books";
import { booksListError, booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const result = await listProductsServer();
  if ("error" in result) return booksListError(result);
  return NextResponse.json({ configured: true, products: result.products });
}

export async function POST(req: Request) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof createProductServer>[0];
  const result = await createProductServer(body);
  if ("error" in result) return booksWriteError(result);
  return NextResponse.json({ product: result });
}
