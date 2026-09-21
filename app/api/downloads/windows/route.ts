import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import path from "path";
import { NextResponse } from "next/server";
import { WINDOWS_INSTALLER_FILE } from "@/lib/brand";
import { consumeDownloadToken } from "@/lib/download-token";
import { hasDownloadAccess } from "@/lib/entitlements";
import { clientIp, rateLimit } from "@/lib/request-guard";
import {
  isCheckoutSessionId,
  retrieveCheckoutSession,
  sessionGrantsDownload,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function installerPath() {
  return path.join(process.cwd(), "private", "downloads", WINDOWS_INSTALLER_FILE);
}

function denied() {
  return NextResponse.json(
    { error: "Sign in and complete checkout to download the Windows app." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`dl:${ip}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many download attempts." },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const sessionId = url.searchParams.get("session_id") ?? "";
  let allowed = false;
  if (token) {
    allowed = await consumeDownloadToken(token);
  } else if (isCheckoutSessionId(sessionId)) {
    const session = await retrieveCheckoutSession(sessionId);
    allowed = sessionGrantsDownload(session);
  } else {
    allowed = await hasDownloadAccess();
  }
  if (!allowed) return denied();

  const filePath = installerPath();
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: "The Windows installer is not on this server yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  const stat = statSync(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/vnd.microsoft.portable-executable",
      "Content-Disposition": `attachment; filename="${WINDOWS_INSTALLER_FILE}"`,
      "Content-Length": String(stat.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
