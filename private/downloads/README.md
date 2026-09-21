# Private Windows installer

`HyperionInvoices-Setup.exe` is served only by `GET /api/downloads/windows` after a verified Stripe Checkout session, signed entitlement cookie, or `has_paid_download` on the organisation.

Do not copy this file into `public/`. Rebuild with `npm run build:windows`.
