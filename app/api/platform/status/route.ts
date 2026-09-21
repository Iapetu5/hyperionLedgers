import { NextResponse } from "next/server";
import { getPlatformStatus } from "@/lib/platform-status.server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPlatformStatus());
}
