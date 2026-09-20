# HyperionLedgers — Complete Product + Technical Specification

Inventory date: 17 September 2026 (Sydney). Based on reading the source under `/workspace/ledgerai`. Do not invent features beyond this document.

---

## 1. Product one-liner and audience

HyperionLedgers is a **client-only browser demo** of Australian small-business bookkeeping (Xero-style competitor concept). Guests browse the fictional **Harbour & Co Studio Pty Ltd** sample organisation; signed-up users can keep a demo org in `localStorage` and choose **sample** or **blank** ledger mode.

**Audience:** Australian SMB operators evaluating a bookkeeping product story (GST/BAS, invoices, quotes, bills, banking CSV, reports, plain-English assistant).

**Positioning:** Demo only — no live bank feeds, real payments, or ATO lodgement. Australian English and AUD throughout. Package name: `hyperionledgers` v0.1.0.

---

## 2. Information architecture / all routes

### Marketing (no demo shell)

| Path | Purpose |
|------|---------|
| `/` | Home: hero, three feature cards, CTAs to demo / try / pricing / signup |
| `/product` | Feature grid (marketing claims; see non-goals for unimplemented areas) |
| `/pricing` | One AUD plan: $69 a month after a 14-day free trial |
| `/try` | Three-step “how to try” (signup → setup → demo) + guest shortcut |
| `/about` | About copy; states product demo / not live accounting |
| `/contact` | Contact form (front-end only; shows success without sending) |
| `/signup` | Create account (step 1 of 2) |
| `/login` | Log in |
| `/onboarding` | Organisation setup (step 2 of 2); requires signed-in + incomplete onboarding |

### Demo app (wrapped in `DemoShell` via `app/demo/layout.tsx`)

| Path | Purpose |
|------|---------|
| `/demo` | Overview / dashboard |
| `/demo/banking` | Bank accounts, CSV import, categorise; `#import` or `?import=1` scrolls to import |
| `/demo/invoices` | Invoice list + create/edit; `?mixed=1` one-click mixed-tax sample |
| `/demo/quotes` | Quote list + create/edit; `?mixed=1` |
| `/demo/bills` | Bill list + create/edit/approve/pay; `?mixed=1` |
| `/demo/products` | Product catalogue CRUD |
| `/demo/tax` | Redirects to `/demo/tax/gst-bas` |
| `/demo/tax/gst-bas` | GST & BAS draft + due-date calendar |
| `/demo/reports` | Reports hub |
| `/demo/reports/profit-loss` | P&L preview |
| `/demo/reports/balance-sheet` | Balance sheet preview |
| `/demo/account` | Account profile (signed-in) or guest CTA |

### Customer-facing pay pages (no demo nav)

| Path | Purpose |
|------|---------|
| `/pay/invoice/[id]` | Public tax invoice / demo pay |
| `/pay/quote/[id]` | Public quote / accept-decline |
| Optional query | `?print=1` auto-triggers `window.print()` after load |

### Empty route folders (no `page.tsx` — not navigable)

`app/demo/contacts`, `expenses`, `payroll`, `projects`, `purchase-orders` exist as empty directories only. Marketing/pricing copy mentions these capabilities; **they are not implemented as app features**.

### Demo sidebar nav (actual)

Overview, Banking, Invoices, Quotes, Bills, Products, GST & BAS, Reports, Account. Header: Ask AI, Log in/Sign up or user name + Log out.

---

## 3. User flows

### A. Guest demo (no account)

1. Land on `/` or `/try` → **Try the demo** → `/demo`.
2. `usesSampleData` is true (no user). Org label is Harbour & Co. Demo banner: “Demo organisation — viewing … sample data.”
3. Browse sample invoices, quotes, bills, banking, BAS, reports. Create forms still work: new docs go to user localStorage keys and appear under “Your created …” when in sample mode.
4. Customer links: `/pay/invoice/INV-1038`, `/pay/quote/QU-210`, etc.

### B. Sign up → onboarding → demo

1. `/signup`: full name, email, password (≥8 chars), business name, optional ABN. Password hashed client-side; account + session stored in localStorage. Redirect `/onboarding`.
2. `/onboarding`: GST registered yes/no; if yes, accruals vs cash; FY end (30 June / 31 March / 31 December / 30 September); optional ABN; **Starting ledger** sample vs blank. Skip button = GST on + accruals + 30 June + sample.
3. Soft gate: signed-in users with `onboardingComplete === false` are redirected from `/demo/*` to `/onboarding`. Guests are not redirected.
4. `/demo` with sample mode shows Harbour KPIs; blank mode shows empty overview until user docs exist.

### C. Blank ledger

1. Onboarding chooses **Blank ledger** (`ledgerMode: "blank"`).
2. Overview empty state: create mixed-tax invoice/quote/bill or explore Harbour (logs out if signed in, then `/demo` as guest).
3. Own cheque account (`blank-chk`), opening balance, blank starter CSVs. No Harbour bank lines or sample KPIs in AI/reports/BAS figures.
4. Explore Harbour & Co sample = `logOut()` + navigate `/demo`.

### D. Log in

`/login` → session restored → if needs onboarding → `/onboarding`, else `/demo`.

---

## 4. Data model

### Auth account (`DemoAccount`)

Fields: `id` (UUID), `fullName`, `email` (lowercased), `passwordHash`, `businessName`, `abn?`, `createdAt` (ISO), `onboardingComplete?`, `gstRegistered?`, `gstAccountingMethod?` (`"accruals"` | `"cash"`), `financialYearEnd?`, `ledgerMode?` (`"sample"` | `"blank"`).

Session (`DemoSession`): `accountId`, `email`, `loggedInAt`.

Rules: `needsOnboarding` only when `onboardingComplete === false` (missing field = already onboarded / legacy). `usesSampleData`: guests always true; signed-in true unless `ledgerMode === "blank"`.

Password: `SHA-256` of `email:password:hyperionledgers-demo-v1` via `crypto.subtle`, hex digest. Never sent to a server.

### Line items / tax

`LineTaxRate`: `"GST"` | `"GST-free"`.

`UserDocLineItem`: `description`, `qty`, `amount` (tax-exclusive line total), `unitPrice`, `taxRate?`, `productId?`.

Document totals: `amount` = tax-inclusive total; `gst` = sum of line GST. GST on a GST line = `round2(amountExGst * 0.1)`; GST-free = 0.

### Invoice (`UserInvoice`)

`id` pattern `INV-U-001`…; `contact`, `issueDate`, `dueDate` (YYYY-MM-DD local), `amount`, `gst`, `status`, `reference`, `recurring`, `lineItems?`, `businessName?`, `businessAbn?` (snapshot at create).

**Stored statuses:** `"Draft"` | `"Awaiting payment"` | `"Paid"` | `"Overdue"`.

**Create default:** status `"Awaiting payment"`, due = today + 14 days, issue = today.

**Display (`effectiveInvoiceStatus`):** Paid stays Paid; Draft stays Draft; if `dueDate < today` → Overdue; if stored Overdue but due date not past → show Awaiting payment.

Sample Harbour invoices: `INV-1042`…`INV-1038`, `INV-R012` (see sample-data).

### Quote (`UserQuote`)

`id` `QU-U-001`…; `contact`, `issueDate`, `expiryDate`, `amount`, `gst`, `status`, `reference`, `lineItems?`, business snapshot.

**Stored statuses:** `"Draft"` | `"Sent"` | `"Accepted"` | `"Declined"`.

**Create default:** `"Sent"`, expiry today + 14.

**Display (`effectiveQuoteStatus`):** Accepted/Declined stick; Draft sticks; if expiry &lt; today → display `"Expired"` (not stored); else stored status.

### Bill (`UserBill`)

`id` `BILL-U-001`…; `supplier`, `date`, `dueDate`, `amount`, `gst`, `status`, `category`, `lineItems?`, business snapshot.

**Stored statuses:** `"Awaiting approval"` | `"Approved"` | `"Overdue"` | `"Paid"`.

**Create default:** `"Awaiting approval"`, due today + 14.

**Display (`effectiveBillStatus`):** Paid stays Paid; if dueDate &lt; today → Overdue; if stored Overdue but not past due → Approved.

Sample bill status overrides: map in `hl_demo_sample_bill_status_v1` + `effectiveSampleBillStatus`.

### Product (`Product`)

`id` sample `PRD-101`…`PRD-106` or user `PRD-U-001`…; `name`, `description?`, `unitPriceExGst`, `tax` (`GST` | `GST-free`), `code?`.

`loadProductsForMode(true)` = SAMPLE_PRODUCTS + user extras; blank = user only. Sample product ids are read-only.

### Bank transaction (`BankTransaction`)

`id`, `accountId` (`chk` or `blank-chk`), `date`, `description`, `amount` (signed AUD), `balance?`, `matched`, `source` (`sample` | `import`), optional category fields: `accountCode`, `accountName`, `taxRate` (`GST` | `GST-free` | `BAS excluded`), `categorisedAt`.

### Chart of accounts (demo)

Codes 400, 404, 410, 420 (income); 610–690 (expense). Keyword `suggestCategory(description, amount)` returns confidence high/medium/low.

### Public doc status overrides

Key map `kind:id` → status string. Pay/accept writes here and syncs user invoice/quote status when id is a user doc.

### Guest business name

`GUEST_DEMO_BUSINESS_NAME = "Demo guest business"` — used on user-created docs when no signed-in org (never silent Harbour branding).

---

## 5. GST / tax rules (as implemented)

1. Line amounts are **tax-exclusive**. Unit prices on products are tax-exclusive.
2. Two document line rates only: **GST** (10%) and **GST-free** (0%).
3. Xero AU labels via `xeroTaxLabel`:
   - Income: **GST on Income** / **GST Free Income**
   - Expense: **GST on Expenses** / **GST Free Expenses**
4. Document GST total = sum of GST on GST lines only. Mixed docs allowed.
5. Summary helper `docTaxTreatmentSummary`: single GST, single free, or **Mixed (GST + GST Free)**; if no lines, gst&gt;0 → GST on Income/Expenses else free.
6. Mixed one-click income lines: “Design services” $500 GST + “GST-free export pack” $200 GST-free → GST $50, total $750.
7. Mixed one-click expense: “Taxable supplies” $500 GST + “GST-free supplier line” $165 GST-free → GST $50, total $715.
8. Banking categorisation tax rates include **BAS excluded** (e.g. bank fees account 680) — separate from document line tax.
9. Onboarding GST method (accruals/cash) is stored for display; document math does not switch cash vs accruals.
10. BAS sample figures are static Harbour numbers, not computed from live user docs.

Rounding: `Math.round(n * 100) / 100`. Max line/total demo guard ≈ $1,000,000.

---

## 6. Feature-by-feature behavior

### Marketing home / product / pricing / try / about / contact

- Home stresses the buy path: Start free trial, Sign up, Pricing ($69 a month, 14-day free trial). Harbour & Co is optional at `/demo`.
- Pricing: one plan, $69 a month after a 14-day free trial. Customer copy must not say “excl. GST”. Stripe Checkout (test mode) when keys are set.
- Contact: Name, Email, Business optional, Topic select, Message; submit sets local “sent” UI only.
- Product page lists projects/payroll/inventory etc. as marketing — those routes are empty.

### Auth

- Accounts key `hl_demo_accounts_v1`; session `hl_demo_session_v1`.
- Validation messages for email/password/duplicate email as in `lib/auth.ts`.
- Log out clears session only (accounts remain).

### ABN

- Checksum validation (11 digits, weight algorithm). Format `XX XXX XXX XXX`.
- Simulated ABR lookup for known ABNs (incl. Harbour `51 824 753 556`) or generic “Demo Entity #### Pty Ltd”. Label: not live ABR.

### Onboarding

As section 3. Skip = GST registered + accruals + 30 June + sample.

### Demo shell / branding banner

- Sample banner vs blank “Blank ledger” / “Your ledger” when user docs exist.
- Org name in nav: `user.businessName` or Harbour name.
- Ask AI opens panel; custom event `hl-open-assistant` can seed a prompt.

### Overview (`/demo`)

**Sample:** NextActionBanner (priority: overdue bills → overdue invoices → quotes awaiting → clear); KPIs cash, net profit YTD, live receivables/payables; cash forecast bars; tasks (reconcile, quotes, overdue inv/bills, BAS); BasDueDates compact; link Import bank CSV.

**Blank empty:** EmptyState + quick links to `?mixed=1` creates + account + BasDueDates.

**Blank with docs:** Next-action insight from user overdue bills/invoices/quotes; KPI cards receivables/payables/quotes awaiting/overdue counts; document counts; mixed-tax shortcuts.

### Invoices

- Create/edit form: contact, line items editor (product picker, qty, amount ex tax, tax select), issue/due dates, stored status select (Draft / Awaiting payment / Paid / Overdue).
- **Create mixed-tax sample:** Acme Pty Ltd + income mixed lines; shows pay-link strip (View / Copy / Print).
- Prefill mixed without creating; `?mixed=1` triggers one-click (with debounce lock).
- After create: status may be set again from form; public status synced.
- Row actions: Copy link, View (`/pay/invoice/id`), Edit, Print / PDF, Delete.
- Blank empty EmptyState; sample mode lists Harbour sample + optional “Your created invoices”.
- Optional “Show tax treatment summary” checkbox.
- Harbour highlight: INV-1042 mixed GST example; INV-1038 overdue chase target.

### Quotes

Same pattern as invoices with expiry instead of due; statuses Draft/Sent/Accepted/Declined; customer link `/pay/quote/id`; display Expired; mixed sample Acme; QU-210 mixed sample highlight.

### Bills

- No public `/pay` route. Print = internal supplier bill summary (nebula header).
- Mixed sample: OfficeNest Supplies Pty Ltd + expense mixed lines.
- Workflow strip/buttons: Approve (Awaiting approval → Approved), Undo Approve, Mark paid, Undo paid → Approved.
- Sample Harbour bills use `setSampleBillStatus` overrides in localStorage.
- Auto Overdue from due date for unpaid.

### Line items editor

- Add/remove lines; product typeahead when catalogue ≥ threshold else select; picking product fills description, amount (unit × qty), tax from product; qty change recalculates amount when product-linked; custom line clears productId.
- Live subtotal / GST / total; Products link opens catalogue in new tab.
- Empty catalogue banner points to Products or mixed-tax sample.

### Products

- CRUD for user products; Harbour samples listed read-only in sample mode.
- Fields: name, description, unit price ex tax, tax (GST on Income 10% / GST Free Income), optional code.
- Search + tax filter; blank empty EmptyState.

### Banking

**Sample mode:** Two Harbour accounts (cheque + savings) from `sample-data`; 7 unmatched sample cheque lines; CSV imports append to `hl_demo_bank_txns_v1` with accountId `chk`.

**Blank mode:** Single own cheque `blank-chk`; no Harbour lines; imports in `hl_demo_blank_bank_txns_v1`; opening balance `hl_demo_blank_opening_v1`; cash = opening + sum(movements). CSV with balance can **infer opening only if unset**. Clear CSV does not clear opening; Clear opening separate.

**CSV:** AU dates DD/MM/YYYY or ISO; amount or debit/credit columns; optional balance; skips bad rows; sample files under `/public/` and embedded fallbacks. Try starter / debit-credit variants for sample vs blank.

**Categorise:** Suggest from chart rules; Apply; Apply all high-confidence; Ask AI; Unmatch; Reset categorisations (`hl_demo_bank_cats_v1`); Clear CSV imports.

### Tax / BAS

- `BasDueDates`: AU quarterly due calendar (28 Oct / 28 Feb / 28 May / 28 Jul patterns) relative to today; demo wording.
- Sample: Jul–Sep 2026 draft boxes (G1 etc. in data; UI shows GST on Income, GST on Expenses, PAYG withheld, net GST); “Mark as prepared (simulated)” toggles local React state only.
- Blank: EmptyState for figures; calendar still shows.

### Reports

- Hub cards to P&L, balance sheet, GST & BAS.
- Sample P&L: sums sample invoice/bill ex-tax and GST; shows `kpis.netProfitYtd` (not equal to simple sum — documented as simplified).
- Sample balance sheet: bank balances + receivables KPI vs payables KPI; equity = assets − liabilities.
- Blank: empty states.

### Account

- Guest: sign up / log in CTA.
- Signed-in: edit business name, ABN, GST registered, method, FY end; ledger mode shown read-only; blank callout + Explore sample.

### Customer pay pages

- Resolves sample id from hardcoded samples, else user localStorage (same browser).
- Nebula `doc-header` tax invoice / quote; line tax column; totals; Pay now (demo) → Paid; Accept / Decline quotes; Draft / Expired / Declined / Paid messaging as implemented.
- SSR-safe first paint for sample ids only; user docs hydrate after mount.
- Print via PrintableDocActions or `?print=1`.

### Print

- Invoices/quotes: modal portal + `TaxDocPrintView` or customer page; `#tax-doc-print`; print CSS keeps nebula header colors.
- Bills: `PrintBillButton` internal summary only.

---

## 7. AI behavior and limits

Implementation: **client-side rules + retrieval** in `lib/ai-copilot.ts`. **No external LLM.** Disclaimer: “Demo assistance only — not a registered tax agent, and does not lodge with the ATO.”

**UI:** Slide-over Ask AI; chips; citations; action buttons (link, prompt, apply-category).

**Intents:** next, bas, categorise, chase_overdue, cash, invoices, bills, quotes, draft_doc, profit, banking, help, unknown.

**Sample / guest mode:** Answers cite Harbour KPIs, INV-1038, overdue bills, unmatched cheque lines, BAS due, etc. Can apply bank categories into localStorage.

**Blank mode:** Different greeting/chips; does not pretend Harbour cash/BAS figures; guides create mixed-tax docs, blank banking, explore sample; can categorise blank unmatched lines; reports live overdue/expired user docs when present.

**Cannot:** Lodge ATO, send email, move money, call live LLM, invent ledger rows outside demo state.

---

## 8. Visual / brand rules

- Name: Hyperion**Ledgers** (Ledgers in brand cyan).
- Logo: `/black-hole-logo.svg` (favicon + BrandLogo).
- Background: `/nebula-bg.svg` full-bleed under `.nebula-surface` with dark overlay (`#050810` base).
- Brand Tailwind cyan scale (`brand-400` `#22d3ee`, `brand-500` `#06b6d4`); fuchsia accents; glass `.card` / white `.doc-card` for documents.
- `.doc-header`: dark slate→purple gradient + cyan radial — used on tax invoices, quotes, bill print.
- Status badges: Paid/Accepted emerald; Awaiting amber; Sent/Approved sky/cyan; Overdue/Expired rose; Draft muted; Declined slate. Header tone variants for nebula strip.
- Buttons: `.btn-primary` (cyan), `.btn-secondary` (glass).
- `lang="en-AU"`; currency `formatAUD`; dates `DD/MM/YYYY` via `formatDateAU`.

---

## 9. Explicit non-goals / simulated

- No commercial billing of Starter/Growth/Studio plans.
- No ATO lodgement or live ABR (ABN lookup simulated).
- No live bank APIs / open banking — CSV browser-side only.
- No real payments on Pay now (status flip in localStorage only).
- No email send (contact form, chase invoices).
- No Single Touch Payroll / real payroll / projects / purchase orders / contacts / expenses modules (empty dirs; marketing may still mention them).
- No server-side auth or multi-device sync — browser `localStorage` only.
- No external AI API.
- Bills have no public vendor pay URL.

---

## 10. Data persistence — localStorage keys

| Key | Contents |
|-----|----------|
| `hl_demo_accounts_v1` | Account array (incl. passwordHash) |
| `hl_demo_session_v1` | Current session |
| `hl_demo_user_invoices_v1` | User invoices |
| `hl_demo_user_quotes_v1` | User quotes |
| `hl_demo_user_bills_v1` | User bills |
| `hl_demo_user_products_v1` | User products |
| `hl_demo_public_doc_status_v1` | Pay/accept status overrides `invoice:id` / `quote:id` |
| `hl_demo_sample_bill_status_v1` | Harbour bill status overrides |
| `hl_demo_bank_txns_v1` | Sample-mode CSV imports |
| `hl_demo_blank_bank_txns_v1` | Blank-mode CSV imports |
| `hl_demo_blank_opening_v1` | Blank opening balance string |
| `hl_demo_bank_cats_v1` | Categorisation overrides by txn id |

**Sample vs user:** Harbour invoices/quotes/bills/products/bank sample lines/KPIs/BAS live in code (`lib/sample-data.ts`, `SAMPLE_PRODUCTS`, `sampleBankTransactions`). User-created docs and imports are browser-local. Guests and `ledgerMode !== "blank"` see sample UI; blank hides Harbour lists/KPIs.

Custom events: `hl-user-docs-updated`, `hl-doc-status`, `hl-products-updated`, `hl-bank-updated`, `hl-open-assistant`.

---

## 11. Tech stack

- **Next.js 14.2.35** App Router (`app/`).
- **React 18**, **TypeScript**, **Tailwind CSS 3.4**, **lucide-react**.
- Almost entirely **`"use client"`** demo; pay pages hydrate sample SSR-safe then read localStorage.
- No database, no auth backend, no API routes required for core demo.
- Scripts: `next dev -H 0.0.0.0 -p 3000`, `build`, `start`, `lint`.
- Public assets: nebula-bg.svg, black-hole-logo.svg, four bank CSV samples.

---

## 12. File map (most important modules)

```
app/
  layout.tsx, page.tsx, globals.css
  signup|login|onboarding|try|pricing|about|contact|product/page.tsx
  demo/layout.tsx, page.tsx
  demo/{banking,invoices,quotes,bills,products,account}/page.tsx
  demo/tax/page.tsx → gst-bas/page.tsx
  demo/reports/{page,profit-loss,balance-sheet}/page.tsx
  pay/invoice/[id]/page.tsx, pay/quote/[id]/page.tsx
components/
  auth/AuthProvider.tsx
  demo/{DemoShell,AiAssistant,LineItemsEditor,NextActionBanner,EmptyState,DocRowActions,ExploreSampleButton}.tsx
  pay/{CustomerDocPage,PrintDocButton,PrintBillButton,TaxDocPrintView,PrintableDocActions}.tsx
  marketing/{BrandLogo,SiteHeader,MarketingFooter}.tsx
  abn/AbnField.tsx, bas/BasDueDates.tsx, ui/StatusBadge.tsx
lib/
  auth.ts, user-docs.ts, public-docs.ts, sample-data.ts, products.ts
  bank-csv.ts, bank-transactions.ts, chart-of-accounts.ts
  ai-copilot.ts, bas-dates.ts, abn.ts, format.ts, use-doc-statuses.ts
public/
  nebula-bg.svg, black-hole-logo.svg, *-bank-statement*.csv
```

---

## 13. Harbour & Co sample reference (rebuild fidelity)

- Org: Harbour & Co Studio Pty Ltd, ABN 51 824 753 556, Surry Hills NSW 2010.
- Cheque ~$42,850.32 (7 to reconcile); savings $86,500; cash on hand KPI $129,350.32; net profit YTD $27,779; health 78 Good.
- Key invoices: INV-1042 Paid mixed; INV-1043/1044 Awaiting payment; INV-R012 Paid recurring; INV-1038 Overdue Maple & Pine.
- Quotes: QU-210 Sent mixed; QU-209 Sent; QU-208 Accepted; QU-207 Declined; QU-206 Draft.
- Bills: BILL-2201 Awaiting approval; BILL-2204 Approved mixed; BILL-2195/2190/2188 Overdue.
- BAS period 1 Jul 2026 – 30 Sep 2026; net GST preview $2,990.91; status draft not lodged.

Rebuild another AI should treat marketing mentions of projects/payroll/PO/contacts/expenses as **out of scope** unless implementing new work; implement the routes and behaviors listed above from the real code paths.
