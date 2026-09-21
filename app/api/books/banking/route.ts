import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getBankDataServer } from "@/lib/server-books";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
  }
  const data = await getBankDataServer();
  if (data.error) return NextResponse.json({ error: data.error }, { status: 401 });
  return NextResponse.json({
    configured: true,
    imports: data.imports,
    catOverrides: data.catOverrides,
    openingBalance: data.openingBalance,
  });
}

export async function PUT(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    imports?: unknown;
    catOverrides?: unknown;
    openingBalance?: number | null;
  };
  const {
    saveBankImportsServer,
    saveBankCatOverridesServer,
    saveBankOpeningBalanceServer,
  } = await import("@/lib/server-books");
  if (Array.isArray(body.imports)) {
    const r = await saveBankImportsServer(body.imports as never);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 401 });
  }
  if (body.catOverrides && typeof body.catOverrides === "object") {
    const r = await saveBankCatOverridesServer(body.catOverrides as Record<string, unknown>);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 401 });
  }
  if (body.openingBalance !== undefined) {
    const r = await saveBankOpeningBalanceServer(body.openingBalance);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 401 });
  }
  const data = await getBankDataServer();
  return NextResponse.json({
    imports: data.imports,
    catOverrides: data.catOverrides,
    openingBalance: data.openingBalance,
  });
}
