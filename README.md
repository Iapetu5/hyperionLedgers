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
| `/api/checkout` | Creates a Stripe Checkout subscription (`$69` / 14-day trial) |
| `/api/stripe/webhook` | Verifies `checkout.session.completed` and records entitlement |
| `/api/downloads/windows` | Gated stream of `HyperionInvoices-Setup.exe` |
| `/demo` | Optional **Try a demo** walkthrough (banner: sample data — not your real account) |

The homepage does **not** dump visitors into the demo.

**Stripe:** Start free trial / Buy posts to `/api/checkout`. Success URL is `/downloads?session_id={CHECKOUT_SESSION_ID}`. The Downloads page retrieves the session (or trusts a signed entitlement cookie / `has_paid_download` on the organisation) before showing the installer. The `.exe` is **not** in `public/` — only the API route streams `private/downloads/HyperionInvoices-Setup.exe`.

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
