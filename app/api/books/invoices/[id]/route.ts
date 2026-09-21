import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import {
  deleteInvoiceServer,
  getInvoiceForOrg,
  updateInvoiceServer,
} from "@/lib/server-books";
import { getSessionOrg } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function notConfigured() {
  return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof updateInvoiceServer>[1];
  const result = await updateInvoiceServer(decodeURIComponent(params.id), body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ invoice: result });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) return notConfigured();
  const ok = await deleteInvoiceServer(decodeURIComponent(params.id));
  if (!ok) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) return notConfigured();
  const ctx = await getSessionOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const invoice = await getInvoiceForOrg(decodeURIComponent(params.id), ctx.orgId);
  if (!invoice) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ invoice });
}
