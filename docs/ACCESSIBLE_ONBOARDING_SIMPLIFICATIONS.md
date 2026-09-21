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
- Search is optional. The confirm form is always visible: **Business name**, optional **ABN**, **Business type**.
- Confirm company is the only primary. A register match is not required to continue to `/onboarding`.
- Live ABR only if `ABR_GUID` is set; otherwise the practice register. Never claim the Australian Business Register unless the GUID is set and the payload is live.

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
- ABN help: `11 digits. Spaces are fine. You can leave this blank.`
- Short ABN: `That ABN needs 11 digits. Spaces are fine.`
- Bad ABN: `That ABN does not look right. Check the 11 digits and try again.`
- Account Save: **Save changes**, then `Saved your business details.`

GST/FY/blank-vs-sample questions, simulated ABR, Stripe, and tax math stay as they are.
