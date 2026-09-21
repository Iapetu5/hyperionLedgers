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
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS company_added boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS stripe_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS download_tokens (
  jti text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS organisations_user_id_idx ON organisations(user_id);

CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contact text NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric(12, 2) NOT NULL,
  gst numeric(12, 2) NOT NULL,
  status text NOT NULL,
  reference text NOT NULL,
  recurring boolean NOT NULL DEFAULT false,
  line_items jsonb,
  business_name text,
  business_abn text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id text PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contact text NOT NULL,
  contact_email text,
  issue_date date NOT NULL,
  expiry_date date NOT NULL,
  amount numeric(12, 2) NOT NULL,
  gst numeric(12, 2) NOT NULL,
  status text NOT NULL,
  reference text NOT NULL,
  line_items jsonb,
  business_name text,
  business_abn text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bills (
  id text PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  supplier text NOT NULL,
  bill_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric(12, 2) NOT NULL,
  gst numeric(12, 2) NOT NULL,
  status text NOT NULL,
  category text NOT NULL,
  line_items jsonb,
  business_name text,
  business_abn text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  unit_price_ex_gst numeric(12, 2) NOT NULL,
  tax text NOT NULL DEFAULT 'GST',
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_bank_data (
  organisation_id uuid PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
  imports jsonb NOT NULL DEFAULT '[]'::jsonb,
  cat_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  opening_balance numeric(12, 2),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_org_idx ON invoices(organisation_id);
CREATE INDEX IF NOT EXISTS quotes_org_idx ON quotes(organisation_id);
CREATE INDEX IF NOT EXISTS bills_org_idx ON bills(organisation_id);
CREATE INDEX IF NOT EXISTS products_org_idx ON products(organisation_id);
