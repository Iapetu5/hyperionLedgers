import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { listInvoicesServer, createInvoiceServer } from "@/lib/server-books";

export const dynamic = "force-dynamic";

function notConfigured() {
  return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
}

export async function GET() {
  if (!isDbConfigured()) return notConfigured();
  const invoices = await listInvoicesServer();
  return NextResponse.json({ configured: true, invoices });
}

export async function POST(req: Request) {
  if (!isDbConfigured()) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof createInvoiceServer>[0];
  const result = await createInvoiceServer(body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ invoice: result });
}
