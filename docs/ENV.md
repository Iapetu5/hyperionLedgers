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
```

## Required for production marketing

| Name | Example | Notes |
|------|---------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://www.hyperioninvoices.com.au` | Canonical www URL. Apex already redirects to www. |

## Persistent accounts (Postgres)

Nicholas: attach Neon from the Vercel dashboard so signups survive across devices.

1. Open the `hyperion-ledgers` project on Vercel → **Storage** → **Create Database** → **Neon**.
2. Confirm `DATABASE_URL` appears under **Settings → Environment Variables** (Production + Preview).
3. Add `SESSION_SECRET` (or `NEXTAUTH_SECRET` — either name works) as a long random string (32+ characters). Do not reuse a password. Generate locally with `openssl rand -hex 32` and paste only into Vercel.
4. Redeploy Production.

The app creates `users`, `organisations`, and `sessions` on first sign-up (`docs/schema.sql`). Until those vars are set, sign-up still works in this browser only.

| Name | Example shape | Where |
|------|----------------|--------|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST/DB?sslmode=require` | Vercel secret (Neon sets this) |
| `SESSION_SECRET` | random 32+ character string | Vercel secret |
| `NEXTAUTH_SECRET` | same value, optional alias | Used only if `SESSION_SECRET` is empty |

## Stripe (Phase 1 buy — test mode)

Create a product in the Stripe Dashboard (test mode) with one recurring price: **$69 AUD per month**. Checkout applies a 14-day trial in code. Hosted Checkout collects a payment method every time (`card`): debit, credit, Apple Pay, and Google Pay on the same session.

| Name | Example shape | Where |
|------|----------------|--------|
| `STRIPE_SECRET_KEY` | `sk_test_…` | Vercel secret |
| `STRIPE_PRICE_ID` | `price_…` | Vercel secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | Vercel (public) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Vercel secret |

Webhook URL: `https://www.hyperioninvoices.com.au/api/stripe/webhook` (event: `checkout.session.completed`).

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

HyperionInvoices does not lodge with the ATO. Do not change DNS.
