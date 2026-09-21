import { NextResponse } from "next/server";
import { grantDownloadFromSession } from "@/lib/entitlements";
import { checkoutOriginAllowed, clientIp, rateLimit } from "@/lib/request-guard";
import { isCheckoutSessionId, retrieveCheckoutSession, sessionGrantsDownload } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!checkoutOriginAllowed(req)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  if (!rateLimit(`dl-claim:${clientIp(req)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { session_id?: string };
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!isCheckoutSessionId(sessionId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const session = await retrieveCheckoutSession(sessionId);
    if (!session || !sessionGrantsDownload(session)) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    await grantDownloadFromSession(session);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
