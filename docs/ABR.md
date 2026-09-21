# Australian Business Register lookup

HyperionInvoices Add company (`/add-company`) and name typeahead call `GET /api/abr/search?q=`.

## Demo (default)

If `ABR_GUID` is not set, the route uses the simulated register in `lib/abn.ts` (`searchAbr` / `searchAbrByName`). People can still search, pick a company, confirm, or type details themselves.

## Live ABR (production)

1. Register a GUID at [ABR web services](https://abr.business.gov.au/Tools/WebServices).
2. Set `ABR_GUID` on the Vercel project `hyperion-ledgers` (Production and Preview). Optional alias: `ABR_GUID_KEY`.
3. Redeploy. The server then calls ABR JSON (`MatchingNames.aspx` / `AbnDetails.aspx`). If that call fails, the demo register is used.

Do not commit a real GUID. See `.env.example` and [ENV.md](./ENV.md).

HyperionInvoices does not lodge with the ATO.
