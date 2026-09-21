# Stripe cards, Apple Pay, Google Pay, and Link

HyperionInvoices Checkout is created only on the server (`POST /api/checkout` and `POST /api/stripe/checkout`). The session uses Stripe **`card`** (debit, credit, **Apple Pay**, **Google Pay**) and **`link`**. The secret key never goes to the browser. Presentment is **AUD $69 / month** (`adaptive_pricing` off) so Checkout does not convert to USD.

Customer copy: **Pay with card, Apple Pay, or Link**.

Do not change DNS. Production URL stays `https://www.hyperioninvoices.com.au`. Do not commit `.env` or real Stripe keys.

## 1. Payment methods in the Stripe Dashboard

In **test mode** first, then repeat in **live mode** before production traffic.

1. Open [Stripe Payment methods](https://dashboard.stripe.com/settings/payment_methods).
2. Turn on **Cards** (debit and credit). This is the `card` type the app already sends.
3. Under **Wallets**, turn on **Apple Pay** and **Google Pay**.
4. Turn on **Link**.
5. Leave bank redirects and other methods off unless Nicholas asks for them.

Checkout still collects a payment method during the 14-day trial (`payment_method_collection=always`).

## 2. Apple Pay domain verification (www + apex)

Register both hostnames so Apple Pay can run on our site and on any future Payment Element embed. Hosted Checkout on `checkout.stripe.com` also needs the account wallets enabled.

1. Stripe Dashboard → **Settings → Payment methods → Apple Pay** (or [Payment method domains](https://dashboard.stripe.com/settings/payment_method_domains)).
2. Add:
   - `www.hyperioninvoices.com.au`
   - `hyperioninvoices.com.au` (apex)
3. If Stripe asks for the Apple domain-association file:
   - Download the file Stripe shows for this account.
   - It must be served at `https://www.hyperioninvoices.com.au/.well-known/apple-developer-merchantid-domain-association` (and the apex if Stripe lists it).
   - Do **not** invent or commit a guessed association file — the contents are account-specific. Paste the Stripe-provided file into Vercel or a public `/.well-known/` route when you have it.
4. Click **Verify** for each domain. Apex already redirects to www; verify both so Apple’s check can succeed on either host.
5. On Vercel (`hyperion-ledgers` project): no DNS change. `NEXT_PUBLIC_APP_URL` stays `https://www.hyperioninvoices.com.au`. Redeploy after env or well-known file changes.

Google Pay does not use that Apple file. It appears on Checkout / Payment Request when Cards + Google Pay are on and the browser supports it (Chrome / Android).

## 3. Vercel env (placeholders only)

Same names as `.env.example`. Set values in the Vercel project — never in Git:

| Name | Purpose |
|------|---------|
| `STRIPE_SECRET_KEY` | Server-only Checkout + retrieve |
| `STRIPE_PRICE_ID` | $69 AUD / month Price |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (Checkout / future Payment Element) |
| `STRIPE_WEBHOOK_SECRET` | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` |
| `NEXT_PUBLIC_APP_URL` | `https://www.hyperioninvoices.com.au` |

Webhook: `https://www.hyperioninvoices.com.au/api/stripe/webhook`.

## 4. How to test

- **Card:** Stripe test cards (e.g. `4242…`) on Checkout.
- **Apple Pay:** Safari + a test Wallet card, after the www/apex domains verify. Use Stripe test mode.
- **Google Pay:** Chrome with a test Google Pay method, same Checkout session.

Guest-only **Try a demo** rules are unchanged.
