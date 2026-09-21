import { NextResponse } from "next/server";
import { resolveAbrSearch } from "@/lib/abr-live";
import { clientIp, rateLimit } from "@/lib/request-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!rateLimit(`abr:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many searches. Try again in a minute." }, { status: 429 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 120);
  const payload = await resolveAbrSearch(q);
  return NextResponse.json(payload);
}
