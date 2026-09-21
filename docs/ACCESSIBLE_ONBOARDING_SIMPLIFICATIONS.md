# Accessible onboarding simplifications (Iapetus)

Shipped on this commercial hub PR. Parallel lanes should reuse these routes instead of a second wizard.

**Navigate, do not enlarge buttons.** Primary Next/Continue is hierarchy (`btn-primary` vs text Skip/Back), not bigger tap targets.

## Signup (`/signup`)
- Short intro. All fields kept (name, email, password, business name, ABN).
- Primary: **Continue** (then `/add-company`).
- Quiet line under the button: Then $69 a month.

## Add company (`/add-company`)
- Dedicated ABR search page (Nicholas). Not only a field on signup.

## Organisation wizard (`/onboarding`)
One decision per screen:
1. GST registered? (default Yes)
2. Method — Accruals / Cash (only if Yes; default Accruals)
3. Financial year end (default 30 June) + optional ABN
4. Start empty (default) vs sample data

Back on steps 2+. Skip is a secondary text action (sample defaults). Then Overview.

## Account (`/demo/account`)
- Title: Your account.
- Blank books: **Create invoice** is the only primary.

## GST/BAS and reports
- Lead: Practice preview. Not sent to the tax office.
- Keep quarter switcher and Mark as prepared. PAYG: Not calculated.
