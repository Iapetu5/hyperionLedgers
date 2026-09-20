import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { updateProfileServer } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof updateProfileServer>[0];
  const result = await updateProfileServer(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ account: result.account });
}
