import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import path from "path";
import { NextResponse } from "next/server";
import { grantDownloadFromSession, hasDownloadAccess } from "@/lib/entitlements";
import { retrieveCheckoutSession, sessionGrantsDownload } from "@/lib/stripe";
import { WINDOWS_INSTALLER_FILE } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function installerPath() {
  return path.join(process.cwd(), "private", "downloads", WINDOWS_INSTALLER_FILE);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  let allowed = await hasDownloadAccess();
  if (!allowed && sessionId) {
    const session = await retrieveCheckoutSession(sessionId);
    if (sessionGrantsDownload(session)) {
      await grantDownloadFromSession(session!);
      allowed = true;
    }
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "Sign in and complete checkout to download the Windows app." },
      { status: 401 }
    );
  }
  const filePath = installerPath();
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: "The Windows installer is not on this server yet. Build it with desktop/README.md." },
      { status: 503 }
    );
  }
  const stat = statSync(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/vnd.microsoft.portable-executable",
      "Content-Disposition": `attachment; filename="${WINDOWS_INSTALLER_FILE}"`,
      "Content-Length": String(stat.size),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
