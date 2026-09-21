# Accessible onboarding simplifications (Iapetus)

Shipped on this commercial hub PR. Parallel lanes should reuse these routes instead of a second wizard.

**Navigate, do not enlarge buttons.** Primary Next/Continue is hierarchy (`btn-primary` vs text Skip/Back), not bigger tap targets.

Signup collects **name, email, and password only**. Company name and ABN are collected on `/add-company`, not on signup.

## Signup (`/signup`)
- Step: `Step 1 of 3 · Your account`
- Title: Create your account
- Short intro. Fields: name, email, password only.
- Password help: Use at least 8 characters.
- Primary: **Next: add your company** (then `/add-company`).
- Quiet line under the button: 14-day trial, then $69 a month.

## Add company (`/add-company`)
- Step: `Step 2 of 3 · Add company`
- Dedicated search → pick → confirm page (Nicholas). Simulated ABR is fine.
- Plain empty / no-results / error copy. Confirm company is the only primary.

## Organisation wizard (`/onboarding`)
- Step: `Step 3 of 3 · Organisation setup` plus inner `Step X of Y`
One decision per screen:
1. GST registered? (default Yes)
2. Method — Accruals / Cash (only if Yes; default Accruals)
3. Financial year end (default 30 June)
4. Start empty (default) vs sample data

Back on steps 2+. Skip is a secondary text action (sample defaults). Then Overview.

## Account (`/demo/account`)
- Title: Your account.
- Intro: Change your business details here. Press Save changes when you finish.
- Blank books: **Create invoice** is the only primary.

## GST/BAS and reports
Owned by another lane. Do not change tax math here.
- Lead: Practice preview. Not sent to the tax office.
- Keep quarter switcher and Mark as prepared. PAYG: Not calculated.

## Follow-on after PR #8 (copy only)

Do not redo the step labels, one-question wizard, or Confirm company primary. Remaining clarity:

### Onboarding
- Inner step names the question: `Step 1 of 4 · GST`.
- Recap of earlier answers: `So far: GST yes · Accruals. Back changes an earlier answer.`
- Step 1 Back is **Back to add company**. Later steps keep **Back**.
- Next names the following question (`Next: year end`). Last CTAs unchanged.
- On a phone, Next is the full-width primary; Back stays text underneath (same `btn-primary` size — do not enlarge).

### Signup
- Form uses `noValidate` so empty or short fields show the inline alerts (`Enter your full name.`, `Use at least 8 characters.`), not the browser tooltip.

### Add company / Account labels
- Confirm fields: **Business name**, **Business type** (options unchanged).
- Empty name: `Enter the business name.`
- ABN help: manual entry requires a valid 11-digit ABN; after a pick, blank is only if you do not have an ABN yet.
- Bad ABN: `That ABN does not look right. Check the 11 digits and try again.`
- Account Save: **Save changes**, then `Saved your business details.`

GST/FY/blank-vs-sample questions, simulated ABR, Stripe, and tax math stay as they are.

## Follow-on after PR #11 (copy / a11y only)

Do not redo recap, Back to add company, Business name/type, Save changes, or signup inline field errors. Remaining leftover wins:

### Login (`/login`)
- Same `noValidate` + inline field errors as signup (`Enter your email address.`, `Enter your password.`).
- Incorrect password stays a form-level alert. Shared marketing header and honesty limits.

### Add company search
- ABN-like empty results: `No business matches that ABN…` (name searches keep the spelling message).
- Confirm heading: **Confirm these details**. Cancelled records get a warning.
- Confirm stays dimmed until there is a business name, with `Enter the business name to confirm.`
- Search again lives on the selected row; Clear and search again is only for typed-in details.

### Account
- Business type and address always visible. Empty name uses `Enter the business name.`
- Save changes shows **Saving…**, then `Saved your business details.` (unchanged success copy).
- Typeahead empty/error states match Add company. ABN helper/errors match Add company.
- Typeahead opens only while typing, not on focus of an already-saved name.

### Onboarding
- Next/Skip show a saving state. Skip copy names sample defaults. After Next, focus moves to the question heading.

