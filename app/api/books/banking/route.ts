import { NextResponse } from "next/server";
import { getBankDataServer } from "@/lib/server-books";
import { booksListError, booksWriteError, requireBooksDb } from "@/lib/books-route";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
  const data = await getBankDataServer();
  if (data.error) return booksListError({ error: data.error });
  return NextResponse.json({
    configured: true,
    imports: data.imports,
    catOverrides: data.catOverrides,
    openingBalance: data.openingBalance,
  });
}

export async function PUT(req: Request) {
  const blocked = requireBooksDb();
  if (blocked) return blocked;
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
    if ("error" in r) return booksWriteError(r);
  }
  if (body.catOverrides !== undefined) {
    if (body.catOverrides === null || typeof body.catOverrides !== "object" || Array.isArray(body.catOverrides)) {
      return NextResponse.json({ error: "catOverrides must be an object map." }, { status: 400 });
    }
    const r = await saveBankCatOverridesServer(body.catOverrides as Record<string, unknown>);
    if ("error" in r) return booksWriteError(r);
  }
  if (body.openingBalance !== undefined) {
    const r = await saveBankOpeningBalanceServer(body.openingBalance);
    if ("error" in r) return booksWriteError(r);
  }
  const data = await getBankDataServer();
  if (data.error) return booksListError({ error: data.error });
  return NextResponse.json({
    imports: data.imports,
    catOverrides: data.catOverrides,
    openingBalance: data.openingBalance,
  });
}
