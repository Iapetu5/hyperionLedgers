import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { setPublicQuoteStatusServer } from "@/lib/server-books";
import type { UserQuote } from "@/lib/user-docs";
import { getPublicQuoteFromDb } from "@/lib/public-books-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { status?: UserQuote["status"] };
  if (!body.status) return NextResponse.json({ error: "Missing status." }, { status: 400 });
  const updated = await setPublicQuoteStatusServer(decodeURIComponent(params.id), body.status);
  if (!updated) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  const doc = await getPublicQuoteFromDb(updated.id);
  return NextResponse.json({ doc });
}
