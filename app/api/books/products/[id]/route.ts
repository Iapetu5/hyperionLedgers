import { NextResponse } from "next/server";
import { deleteProductServer, updateProductServer } from "@/lib/server-books";
import { booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof updateProductServer>[1];
  const result = await updateProductServer(decodeURIComponent(params.id), body);
  if ("error" in result) return booksWriteError(result);
  return NextResponse.json({ product: result });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const result = await deleteProductServer(decodeURIComponent(params.id));
  if ("error" in result) return booksWriteError(result, 404);
  return NextResponse.json({ ok: true });
}
