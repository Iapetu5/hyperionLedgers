-- HyperionInvoices persistent accounts (Neon / Postgres)
-- Applied automatically on first auth request when DATABASE_URL is set.
-- Placeholders only — do not put connection strings in this file.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS has_paid_download boolean NOT NULL DEFAULT false;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE TABLE IF NOT EXISTS stripe_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS organisations_user_id_idx ON organisations(user_id);
