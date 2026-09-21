import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { signUpServer } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Postgres is not attached yet. Add DATABASE_URL and SESSION_SECRET on the Vercel project, then redeploy.",
      },
      { status: 503 }
    );
  }
  const body = (await req.json().catch(() => ({}))) as {
    fullName?: string;
    email?: string;
    password?: string;
  };
  const result = await signUpServer({
    fullName: body.fullName ?? "",
    email: body.email ?? "",
    password: body.password ?? "",
  });
  if (!result.ok) return NextResponse.json({ configured: true, error: result.error }, { status: 400 });
  return NextResponse.json({ configured: true, account: result.account });
}
