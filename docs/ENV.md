# Environment variables

Copy `.env.example` for local work. Set the same names on the Vercel project `hyperion-ledgers` (Production and Preview). Do not put live secrets in git.

```
NEXT_PUBLIC_APP_URL=https://www.hyperioninvoices.com.au
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## Required for production marketing

| Name | Example | Notes |
|------|---------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://www.hyperioninvoices.com.au` | Canonical www URL. Apex already redirects to www. |

## Stripe (Phase 1 buy — test mode)

Create a product in the Stripe Dashboard (test mode) with one recurring price: **$69 AUD per month**. Enable a **14-day trial** on Checkout via the app (`subscription_data.trial_period_days = 14`). Paste:

| Name | Example shape | Where |
|------|----------------|--------|
| `STRIPE_SECRET_KEY` | `sk_test_…` | Vercel secret |
| `STRIPE_PRICE_ID` | `price_…` | Vercel secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | Vercel (public) |

Until those three are set, **Start free trial** still works: it opens `/checkout` and explains that test keys are required, then **Continue to sign up**. Do not invent or commit real keys.

HyperionLedgers does not lodge with the ATO. Do not change DNS.
