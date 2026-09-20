# Real-product onboarding (Iapetus lane)

**Audience:** Hyperion Phase 1 (auth / DB / Stripe)  
**Scope:** Signed-in organisation setup after signup — GST registration, financial year, blank vs sample books.  
**Out of scope:** Tax calculation libraries, BAS math, Stripe checkout UI, marketing chrome.

Assumes durable **server-backed** org + user data (not `localStorage` demo auth).

---

## Goal

After signup, a signed-in user completes organisation setup once, then lands somewhere useful:

- **Blank books** → Overview with a clear “create first invoice / quote / bill” path (`/demo?welcome=1` or product equivalent).
- **Sample books** → Harbour-style tour under the org, without implying those docs are the user’s own.

---

## Required org fields (persist on server)

| Field | Type | Notes |
|-------|------|--------|
| `onboardingComplete` | boolean | `false` until setup finishes; gate demo/app until true (except the onboarding route). |
| `gstRegistered` | boolean | Required. |
| `gstAccountingMethod` | `"accruals" \| "cash"` | Required **only if** `gstRegistered === true`; omit/null if not registered. |
| `financialYearEnd` | enum string | One of: `30 June` (AU default), `31 March`, `31 December`, `30 September`. |
| `ledgerMode` | `"blank" \| "sample"` | Default **blank**. |
| `abn` | string \| null | Optional at onboarding; validate if present. Prefill from signup if already collected. |
| `businessName` | string | From signup; show on the page (“preferences for {businessName}”). |

Server must own these on the **Organisation** (or equivalent), not browser-only account JSON.

---

## UI flow (product copy)

**Step label:** `Step 2 of 2 · Organisation setup`  
**Title:** `Set up your organisation`  
**Intro:** `A few preferences for {businessName}. Next you'll create a first invoice, quote, or bill — about two minutes total.`

### 1. GST registration
**Legend:** `Are you registered for GST?`

- **Yes** — `Show GST on sales and purchases, plus BAS due dates.`
- **No** — `Hide GST on documents; BAS due dates still shown for planning.`

If Yes, show method:

**Legend:** `GST accounting method`

- **Accruals** — `GST when you invoice or receive a bill.`
- **Cash** — `GST when money hits the bank.`

### 2. Financial year end
**Label:** `Financial year end`  
Select: 30 June (default), 31 March, 31 December, 30 September.

### 3. ABN (optional)
Reuse existing ABN field behaviour; do not block continue if empty unless product later requires it.

### 4. How to start
**Legend:** `How would you like to start?`

- **Start empty** (default) — `Default for a new organisation. Begin under your business name, then create a first invoice, quote, or bill — a ready-made example is one click away.`
- **Sample data** — `Optional tour of Harbour & Co invoices, banking and BAS. Not your own first document.`

When **Start empty** is selected, show callout:  
`After Continue you'll land on Overview with clear shortcuts to create an invoice, quote, or bill.`

### Primary CTA
- Blank: `Continue — create your first document` → app home with create-first welcome.
- Sample: `Continue to your organisation` → app home (sample books).

### Skip
`Skip — use sample data` → completes onboarding with sample defaults (GST registered, accruals, FY 30 June, `ledgerMode: sample`) so the user is not stuck. Do **not** leave `onboardingComplete: false`.

### Footer (real product — replace demo line)
Replace `Demo setup — preferences stay in this browser only.` with:  
`Saved to your HyperionLedgers organisation. You can change these later in Account settings.`

---

## API contract (for Hyperion Phase 1)

`POST /api/org/onboarding` (name flexible) — authenticated.

**Body:**

```json
{
  "gstRegistered": true,
  "gstAccountingMethod": "accruals",
  "financialYearEnd": "30 June",
  "ledgerMode": "blank",
  "abn": "51 824 753 556"
}
```

**Rules:**

- Reject if `gstRegistered` true and method missing.
- Ignore method if not GST-registered.
- Set `onboardingComplete: true` atomically with the fields.
- Blank: ensure org documents start empty (no Harbour rows attached to this org).
- Sample: attach or flag sample dataset for that org without writing Harbour rows into the user’s permanent books as if they created them (read-only sample overlay is fine).

**GET session/org** must return these fields so the client can gate routes without localStorage.

---

## Success criteria

1. New signup cannot use the main app until onboarding completes or skip completes.
2. Preferences survive logout / new device (server).
3. Blank org never shows Harbour invoices as “yours”.
4. UI copy never claims ATO lodgement or that sample books are the user’s filings.
5. Tax calculation libraries are not rewritten for this work.

---

## Non-goals (this lane)

- Stripe billing / plan selection on this screen.
- Rewriting GST/BAS rollup or tax libs.
- Marketing site chrome.

