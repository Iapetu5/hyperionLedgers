import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { createProductServer, listProductsServer } from "@/lib/server-books";

export const dynamic = "force-dynamic";

function notConfigured() {
  return NextResponse.json({ configured: false, error: "Postgres is not attached yet." }, { status: 503 });
}

export async function GET() {
  if (!isDbConfigured()) return notConfigured();
  return NextResponse.json({ configured: true, products: await listProductsServer() });
}

export async function POST(req: Request) {
  if (!isDbConfigured()) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Parameters<typeof createProductServer>[0];
  const result = await createProductServer(body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ product: result });
}
