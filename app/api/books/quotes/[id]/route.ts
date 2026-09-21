import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { deleteQuoteServer, updateQuoteServer } from "@/lib/server-books";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof updateQuoteServer>[1];
  const result = await updateQuoteServer(decodeURIComponent(params.id), body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ quote: result });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
  }
  const ok = await deleteQuoteServer(decodeURIComponent(params.id));
  if (!ok) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
