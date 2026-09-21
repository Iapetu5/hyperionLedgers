import { neon } from "@neondatabase/serverless";

export function isDbConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

type Sql = ReturnType<typeof neon>;
let cached: Sql | null = null;
let schemaReady = false;

export function db() {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!cached) {
    cached = neon(process.env.DATABASE_URL!.trim());
  }
  return cached;
}

export async function ensureSchema() {
  if (schemaReady) return;
  const sql = db();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      full_name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS organisations (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      abn text,
      gst_registered boolean,
      gst_accounting_method text,
      financial_year_end text,
      ledger_mode text,
      onboarding_complete boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS organisations_user_id_idx ON organisations(user_id)`;
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS has_paid_download boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS subscription_status text`;
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text`;
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS stripe_subscription_id text`;
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS entity_type text`;
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address text`;
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS company_added boolean NOT NULL DEFAULT false`;
  await sql`
    CREATE TABLE IF NOT EXISTS stripe_events (
      id text PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS download_tokens (
      jti text PRIMARY KEY,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  schemaReady = true;
}
