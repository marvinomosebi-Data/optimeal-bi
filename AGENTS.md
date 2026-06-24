# OptiMeal — Project Context for Codex

## What this is
A working React + Vite + Supabase PWA, not a from-scratch build. Two separate
experiences: a student meal optimizer (Bounded Knapsack engine) and an
admin BI dashboard, role-gated. Full product/domain spec is in
`PROJECT_BRIEF.md` in this same folder — read that first for the *why*
behind every rule. This file is the *current state* — what's done, what's
broken, what's next.

## Status: this is a real, mostly-working codebase
Don't rebuild from scratch. Audit, fix, and finish it. Key files:

- `src/lib/optimizer.js` — the knapsack engine. Auto mode vs. manual mode
  are correctly separated, crave-bonus scoring is correctly kept out of the
  displayed satiety figures. This is solid — treat changes here as
  surgical, not a rewrite, and re-run it against test cases before trusting
  any change (see "Testing" below).
- `src/lib/dataService.js` — single data-access layer, Supabase-or-local
  fallback. Already handles the snake_case → camelCase normalization
  (`max_portions` → `maxPortions` etc.) that broke this exact engine before.
- `src/lib/supabase.js` — auth (ID-based login via `id_lookup`), saved
  plans, admin price-write functions.
- `supabase/schema.sql` — **just patched, see below.**

## Fixes already applied (verify these landed correctly, then move on)
1. **RLS anti-pattern fixed.** The admin update policies on `food_items`
   and `cafeteria_items` previously queried `auth.users` directly
   (`select raw_user_meta_data->>'role' from auth.users where id = auth.uid()`),
   which silently fails because anon/authenticated roles aren't granted
   select on `auth.users`. Replaced with `auth.jwt() -> 'user_metadata' ->>
   'role'`, which reads the role straight out of the JWT and actually works.
2. **`id_lookup` table was missing entirely.** `src/lib/supabase.js` reads
   from and writes to `id_lookup` in both `signIn` and `signUp`, but the
   table was never created in `schema.sql` — sign-up would throw on a
   fresh database. Added the table (`id_number` PK, `bowen_email` unique,
   `user_id` FK) plus public select/insert policies (both operations
   happen pre-session, so RLS here isn't the security boundary — the
   bowen.edu.ng email-confirmation gate is).
3. **`admin insert nbs_prices` policy was missing.** `nbs_prices` only had
   a public SELECT policy, so every submission from the Monthly NBS
   Reference Update form hit RLS and failed silently. Added an insert
   policy gated on `auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'`,
   consistent with the food_items/cafeteria_items pattern.
4. **NBS success-message bug fixed (`Admin.jsx`).** The success banner
   always showed "0 prices saved" because `filled` (the live form-field
   count) recalculated to 0 the instant `setPrices({})` cleared the form
   after a successful save. Fixed by capturing `rows.length` into a
   separate `savedCount` state before clearing, and rendering that instead.
5. **`jollof_spaghetti` drift resolved.** `src/data/dataset.js` had a
   "Jollof Spaghetti" item (`id: jollof_spaghetti`, Rice & Grains, ₦350,
   satiety 7) that was missing from `supabase/seed.sql`, causing live and
   local menus to differ. Added to `seed.sql` immediately after the
   `spaghetti` row.

## Before writing any new code
1. Run `supabase/schema.sql` then `supabase/seed.sql` against a **fresh**
   Supabase project to confirm the two fixes above actually work end to
   end (sign up with a real bowen.edu.ng email, confirm it, sign in by ID,
   then manually promote that user to admin and confirm the admin price
   edit actually saves).
2. Test the optimizer engine in isolation before touching UI — there's no
   formal test file yet. Write quick Node scripts that call
   `optimizeMeal()` directly with a few budget/appetite/cafeteria
   combinations and eyeball the output. This caught every major bug in
   earlier iterations of this project; don't skip it just because the
   engine already exists.

## What's genuinely unfinished / next
- Admin dashboard (`src/pages/Admin.jsx`) — exists, but is the least
  polished screen per the original plan. This is the best candidate for
  fresh Stitch-generated mockups — don't redesign the student-facing pages
  that already work.
- Volatility rankings and submission history sections — check they're
  wired to live data, not placeholder.
- Keep `src/data/dataset.js` in sync with `supabase/seed.sql` whenever
  either changes — drift between them was a recurring bug (soup redesign,
  jollof_spaghetti). Both are now confirmed in sync as of this session.

## Known constraints, don't relitigate these
- Admin role is never self-granted from the client — only via manual SQL
  by the developer. Don't add a client-side "become admin" path.
- Public sign-up always creates students.
- Guest mode is allowed for the optimizer; no account needed.
- Manual portion adjustment intentionally relaxes the auto-optimizer's
  ratio/type/piece caps — only budget and base/protein compatibility still
  apply. This is by design, not a bug — see the comments at the top of
  `optimizer.js`.

## Deployment target
Vite static build → Vercel or Netlify. Supabase stays as the hosted
backend. No server runtime needed beyond Supabase itself.
