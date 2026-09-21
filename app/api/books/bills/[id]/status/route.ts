import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { setBillStatusServer } from "@/lib/server-books";
import type { UserBill } from "@/lib/user-docs";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { status?: UserBill["status"] };
  if (!body.status) return NextResponse.json({ error: "Missing status." }, { status: 400 });
  const bill = await setBillStatusServer(decodeURIComponent(params.id), body.status);
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  return NextResponse.json({ bill });
}
