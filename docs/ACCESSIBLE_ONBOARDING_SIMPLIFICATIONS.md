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
- Intro: Change your business details here. Press Save when you finish.
- Blank books: **Create invoice** is the only primary.

## GST/BAS and reports
Owned by another lane. Do not change tax math here.
- Lead: Practice preview. Not sent to the tax office.
- Keep quarter switcher and Mark as prepared. PAYG: Not calculated.
