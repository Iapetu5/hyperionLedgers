/**
 * Apply docs/schema.sql to DATABASE_URL (Neon / Postgres).
 * On Vercel this is optional — ensureSchema() runs on first /api/auth/me,
 * signup, login, books, or download-token request. Never commit a real .env.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim() ?? "";
if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
  console.log(
    "DATABASE_URL is not set. Schema is applied automatically on Vercel at the first auth/books request (ensureSchema), and again during `npm run build` when DATABASE_URL is present.",
  );
  process.exit(0);
}

const sql = neon(url);
const file = resolve(process.cwd(), "docs/schema.sql");
const raw = readFileSync(file, "utf8");
const statements = raw
  .split(";")
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}
console.log(`Applied ${statements.length} statements from docs/schema.sql`);
