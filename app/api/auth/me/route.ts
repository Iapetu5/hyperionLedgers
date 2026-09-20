import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getSessionAccount } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, persistence: "local", account: null });
  }
  const account = await getSessionAccount();
  return NextResponse.json({
    configured: true,
    persistence: "server",
    account,
  });
}
