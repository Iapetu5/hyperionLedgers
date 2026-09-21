import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getPublicQuoteFromDb } from "@/lib/public-books-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, doc: null });
  }
  const doc = await getPublicQuoteFromDb(decodeURIComponent(params.id));
  if (!doc) return NextResponse.json({ configured: true, doc: null }, { status: 404 });
  return NextResponse.json({ configured: true, doc });
}
