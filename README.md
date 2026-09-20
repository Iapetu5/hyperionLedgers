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

See [docs/ENV.md](docs/ENV.md) and `.env.example`:

```
NEXT_PUBLIC_APP_URL=https://www.hyperioninvoices.com.au
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Set the Stripe test keys on the Vercel project `hyperion-ledgers` to enable Checkout. Without them, the UI buy path still ships.

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
