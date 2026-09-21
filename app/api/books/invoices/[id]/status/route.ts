import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { setInvoiceStatusServer } from "@/lib/server-books";
import type { UserInvoice } from "@/lib/user-docs";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { status?: UserInvoice["status"] };
  if (!body.status) return NextResponse.json({ error: "Missing status." }, { status: 400 });
  const invoice = await setInvoiceStatusServer(decodeURIComponent(params.id), body.status);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json({ invoice });
}
