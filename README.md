# HyperionInvoices

Australian bookkeeping for small business. **$69 a month** after a **14-day free trial**. Does not lodge with the ATO.

Production: [https://www.hyperioninvoices.com.au](https://www.hyperioninvoices.com.au)

## Buy path

| Path | Purpose |
|------|---------|
| `/` | Marketing homepage — Start free trial, Sign up, Pricing |
| `/pricing` | One plan: $69 a month, 14-day free trial |
| `/signup` or `/try` | Start the trial / create an account |
| `/login` | Log in |
| `/product` | Product overview |
| `/checkout` | Stripe Checkout stub if keys are missing (success redirects to Downloads) |
| `/downloads` | After a valid Stripe session or paid account — unlock Windows `.exe` |
| `/api/checkout` | Creates a Stripe Checkout subscription (`$69` / 14-day trial) — legacy alias |
| `/api/stripe/checkout` | Creates a Stripe Checkout subscription (`$69` / 14-day trial) |
| `/api/stripe/status` | Stripe + persistence env diagnostics (no secrets) |
| `/api/stripe/webhook` | Verifies `checkout.session.completed` and records entitlement |
| `/api/downloads/windows` | Gated stream of `HyperionInvoices-Setup.exe` |
| `/demo` | Optional **Try a demo** walkthrough (banner: sample data — not your real account) |
| `/api/quotes/send` | Email a quote when `EMAIL_*` / Gmail is set on Vercel. Without those vars the quote stays **Sent**; copy the customer link or print/PDF instead. |

The homepage does **not** dump visitors into the demo.

**Stripe:** Start free trial / Buy posts to `/api/stripe/checkout` (server-only; `/api/checkout` remains as an alias). Signed-out visitors are sent to **sign up** (or log in) before Checkout when Postgres is attached. Checkout is `card` + `link` so customers can **pay with card, Apple Pay, or Link** (Google Pay on the same hosted page when Stripe shows it). Amount is **$69 AUD / month** (adaptive pricing off). Success URL is `/downloads?session_id={CHECKOUT_SESSION_ID}`. The Downloads page **retrieves the session from Stripe** (or a signed `hl_entitlement` cookie / `has_paid_download`). It does **not** set cookies during page render. `?success=1` is ignored. The `.exe` is **not** in `public/` — `/api/downloads/windows` streams `private/downloads/HyperionInvoices-Setup.exe` after a 10-minute single-use token, a verified `session_id`, or an httpOnly session/entitlement.

Apple Pay domain verification for `www.hyperioninvoices.com.au` and the apex: [docs/STRIPE_APPLE_PAY.md](docs/STRIPE_APPLE_PAY.md).

## Download security

- Checkout sessions are created only in `POST /api/checkout` (origin check + rate limit). Secret key never goes to the browser.
- Webhook `POST /api/stripe/webhook` verifies `Stripe-Signature` (`whsec_…`), rejects unknown event ids, stores `evt_` ids for idempotency, then **re-fetches** the session from Stripe before granting.
- Entitlement is written to `organisations.has_paid_download` / `subscription_status`. Cookies are httpOnly, `SameSite=lax`, Secure on Vercel.
- Unauthenticated `GET /api/downloads/windows` returns **401**. Download links use a short-lived signed token (`SESSION_SECRET`). Rate limited.
- Placeholders only in `.env.example`. Never commit `.env` or real keys.

## Environment

See [docs/ENV.md](docs/ENV.md) and `.env.example` (placeholders only — never commit a real `.env`):

```
NEXT_PUBLIC_APP_URL=https://www.hyperioninvoices.com.au
DATABASE_URL=
SESSION_SECRET=
NEXTAUTH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

**Accounts:** attach Neon on the Vercel project (`Storage → Create Database → Neon`) so `DATABASE_URL` is set, then add `SESSION_SECRET` and redeploy. Schema is in `docs/schema.sql` and is applied on first sign-up.

**Quote email (optional):** `POST /api/quotes/send` needs one of these on the Vercel project (Production + Preview) — never commit real values:

- `GMAIL_USER` + `GMAIL_APP_PASSWORD` (smtp.gmail.com), or
- `EMAIL_SMTP_HOST` + `EMAIL_SMTP_USER` + `EMAIL_SMTP_PASS` (optional `EMAIL_SMTP_PORT`, `EMAIL_FROM`), or
- `EMAIL_API_KEY` (Resend)

Until those are set, Send quote shows **Copy customer link** and **Print / PDF**. New quotes stay **Sent**, not Draft. Details: [docs/ENV.md](docs/ENV.md).

**Stripe:** set the test keys on Vercel project `hyperion-ledgers` to enable Checkout. Without them, the UI buy path still ships.

## Windows installer

```bash
npm run build:windows
```

Requires Go. Output: `private/downloads/HyperionInvoices-Setup.exe`. See [desktop/README.md](desktop/README.md). Mac is coming soon.

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
