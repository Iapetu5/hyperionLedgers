import { NextResponse } from "next/server";
import { setBillStatusServer } from "@/lib/server-books";
import type { UserBill } from "@/lib/user-docs";
import { booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as { status?: UserBill["status"] };
  if (!body.status) return NextResponse.json({ error: "Missing status." }, { status: 400 });
  const bill = await setBillStatusServer(decodeURIComponent(params.id), body.status);
  if ("error" in bill) return booksWriteError(bill, 404);
  return NextResponse.json({ bill });
}
