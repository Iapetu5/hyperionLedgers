import { NextResponse } from "next/server";
import { deleteBillServer, getBillForOrg, updateBillServer } from "@/lib/server-books";
import { getSessionOrg } from "@/lib/server-auth";
import { booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof updateBillServer>[1];
  const result = await updateBillServer(decodeURIComponent(params.id), body);
  if ("error" in result) return booksWriteError(result);
  return NextResponse.json({ bill: result });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const result = await deleteBillServer(decodeURIComponent(params.id));
  if ("error" in result) return booksWriteError(result, 404);
  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const ctx = await getSessionOrg();
  if (!ctx) return NextResponse.json({ error: "You need to be signed in." }, { status: 401 });
  const bill = await getBillForOrg(decodeURIComponent(params.id), ctx.orgId);
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  return NextResponse.json({ bill });
}
