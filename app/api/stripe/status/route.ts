import { NextResponse } from "next/server";
import { stripeEnvDiagnostics } from "@/lib/stripe-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await stripeEnvDiagnostics());
}
