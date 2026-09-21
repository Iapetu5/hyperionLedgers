import { NextResponse } from "next/server";
import { setInvoiceStatusServer } from "@/lib/server-books";
import type { UserInvoice } from "@/lib/user-docs";
import { booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as { status?: UserInvoice["status"] };
  if (!body.status) return NextResponse.json({ error: "Missing status." }, { status: 400 });
  const invoice = await setInvoiceStatusServer(decodeURIComponent(params.id), body.status);
  if ("error" in invoice) return booksWriteError(invoice, 404);
  return NextResponse.json({ invoice });
}
