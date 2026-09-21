# Environment variables

Copy `.env.example` for local work. Set the same **names** on the Vercel project `hyperion-ledgers` (Production and Preview). Values stay in the Vercel dashboard — never commit `.env`, `.env.local`, or `.env.production`.

```
NEXT_PUBLIC_APP_URL=https://www.hyperioninvoices.com.au
DATABASE_URL=
SESSION_SECRET=
NEXTAUTH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
EMAIL_FROM=
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_API_KEY=
ABR_GUID=
```

## Required for production marketing

| Name | Example | Notes |
|------|---------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://www.hyperioninvoices.com.au` | Canonical www URL. Apex already redirects to www. |

## Persistent accounts (Postgres)

Nicholas: Neon store **neon-chestnut-engine** is the production database. Signups and org books survive across devices once `DATABASE_URL` + `SESSION_SECRET` are on the Vercel project and Production has been redeployed.

### Attach Neon (first time, or if `persistence.database` is false)

1. Open [Vercel](https://vercel.com) → project **`hyperion-ledgers`** (not a preview comment — the project itself).
2. **Storage** → **Create Database** → **Neon** (or open the existing **neon-chestnut-engine** store).
3. **Connect Project** / **Connect** → `hyperion-ledgers`.
4. Environments: tick **Production** and **Preview**. Confirm.
5. Vercel writes `DATABASE_URL` (`postgresql://…` or `postgres://…`, usually `sslmode=require`). Check **Settings → Environment Variables** — both Production and Preview must list `DATABASE_URL`. Do not paste the URL into Git.

### SESSION_SECRET (required for cookies + download tokens)

`downloadTokens` is true only when this secret is at least 16 characters (`SESSION_SECRET` or alias `NEXTAUTH_SECRET`).

1. On your laptop (do not commit the output):

   ```bash
   openssl rand -hex 32
   ```

2. Vercel project **`hyperion-ledgers`** → **Settings → Environment Variables** → **Add**.
3. Key: `SESSION_SECRET`. Value: the hex string. Environments: **Production** + **Preview**. Sensitive / encrypted.
4. **Deployments** → latest Production → **⋯ → Redeploy** (or push an empty commit). Env changes do not apply until a new deploy.

### Confirm (no secrets in the JSON)

After the Production deploy is Ready:

```bash
curl -sS https://www.hyperioninvoices.com.au/api/stripe/status
curl -sS https://www.hyperioninvoices.com.au/api/auth/me
```

Expect `persistence.database`, `persistence.sessionSecret`, `persistence.downloadTokens` all `true`, `missing: []`, and `/api/auth/me` → `"persistence":"server"`. Live production already reports those three as `true` with `missing: []` and `persistence:"server"` (unsigned `/api/auth/me` has `account: null` until you log in).

If a dashboard or Preview URL still shows `downloadTokens` / `DATABASE_URL` / `SESSION_SECRET` false:

- Curl **www** Production, not a `*.vercel.app` Preview. Preview is false until those two vars are ticked for the Preview environment and that Preview is redeployed.
- Env edits do nothing until **Redeploy** (or a new git push). The running Production deployment keeps the old env.
- `SESSION_SECRET` must be at least 16 characters (`openssl rand -hex 32` is 64 hex chars).

### Schema / migrate

Tables are created automatically (`ensureSchema()` in `lib/db.ts`) on the first `/api/auth/me`, signup, login, books, or download-token request. `GET /api/stripe/status` also applies schema and reports `persistence.schemaApplied`.

`npm run build` (Vercel Production/Preview) runs `npm run migrate` first. When `DATABASE_URL` is present it applies `docs/schema.sql`; when it is missing the script exits 0 and `ensureSchema()` still covers the first request.

Optional local / one-off (uses `DATABASE_URL` from the shell — never commit `.env`):

```bash
npm run migrate
```

Until `DATABASE_URL` + `SESSION_SECRET` are set, sign-up still works in this browser only.

| Name | Example shape | Where |
|------|----------------|--------|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST/DB?sslmode=require` | Vercel secret (Neon sets this) |
| `SESSION_SECRET` | random 32+ character string | Vercel secret |
| `NEXTAUTH_SECRET` | same value, optional alias | Used only if `SESSION_SECRET` is empty |

## Stripe (Phase 1 buy — test mode)

Create a product in the Stripe Dashboard (test mode) with one recurring price: **$69 AUD per month**. Checkout applies a 14-day trial in code, forces **AUD** presentment (adaptive pricing off), and collects a payment method every time (`card` + `link`): debit, credit, Apple Pay, Google Pay, and Link. When Postgres is attached, Checkout is created only for a signed-in session — **Start free trial** sends signed-out visitors to signup first.

| Name | Example shape | Where |
|------|----------------|--------|
| `STRIPE_SECRET_KEY` | `sk_test_…` | Vercel secret |
| `STRIPE_PRICE_ID` | `price_…` | Vercel secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | Vercel (public) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Vercel secret |

Webhook URL: `https://www.hyperioninvoices.com.au/api/stripe/webhook` (events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`).

Apple Pay / Google Pay Dashboard steps, including domain verification for `www.hyperioninvoices.com.au` and the apex: [STRIPE_APPLE_PAY.md](./STRIPE_APPLE_PAY.md).

Do not invent or commit real keys.

## Quote email (optional)

`POST /api/quotes/send` emails a customer quote when one of these is set on Vercel. Without them, Send quote still works in the UI and shows “Email is not configured” — new quotes stay **Sent**, not Draft.

| Name | Example shape | Where |
|------|----------------|--------|
| `GMAIL_USER` | `you@gmail.com` | Vercel secret |
| `GMAIL_APP_PASSWORD` | Gmail app password | Vercel secret |
| `EMAIL_SMTP_HOST` | `smtp.gmail.com` | Vercel secret |
| `EMAIL_FROM` | `quotes@yourdomain.com.au` | Vercel (public-ish) |
| `EMAIL_API_KEY` | Resend `re_…` | Vercel secret |

Do not invent or commit real keys.

## Australian Business Register (optional)

Name typeahead on signup, onboarding, add-company, and Account calls `GET /api/abr/search?q=`.

| Name | Example shape | Where |
|------|----------------|--------|
| `ABR_GUID` | ABR web-services GUID | Vercel secret |
| `ABR_GUID_KEY` | same value, optional alias | Used only if `ABR_GUID` is empty |

Leave empty in Git and on local machines that should stay on the demo register. When `ABR_GUID` is set, the server calls ABR JSON (`MatchingNames.aspx` / `AbnDetails.aspx`). If that call fails, the route falls back to the same demo matches so people can still pick a company or type details themselves.

Register a GUID at [ABR web services](https://abr.business.gov.au/Tools/WebServices). Do not invent or commit a real GUID. Full hookup: [ABR.md](./ABR.md).

HyperionInvoices does not lodge with the ATO. Do not change DNS.
