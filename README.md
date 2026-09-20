# HyperionLedgers

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
| `/checkout` | Stripe Checkout (test mode) or a stub if keys are missing |
| `/demo` | Optional Harbour & Co **sample data** (banner: sample data) |

The homepage does **not** dump visitors into the demo.

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
```

**Accounts:** attach Neon on the Vercel project (`Storage → Create Database → Neon`) so `DATABASE_URL` is set, then add `SESSION_SECRET` and redeploy. Schema is in `docs/schema.sql` and is applied on first sign-up.

**Stripe:** set the three test keys on Vercel project `hyperion-ledgers` to enable Checkout. Without them, the UI buy path still ships.

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
