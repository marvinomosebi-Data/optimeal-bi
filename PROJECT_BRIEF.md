# OptiMeal — Full Project Brief

## What This Is

A web application (OptiMeal) with two completely separate experiences:

- **Student Meal Optimizer** — budget-constrained meal planning using Bounded Knapsack
- **Admin Dashboard** — BI analytics + campus price regulation, accessible only to promoted admin accounts

## Tech Stack

- Frontend: React + Vite + JavaScript, Tailwind CSS, Recharts for charts
- Backend: Supabase (Postgres + Auth + RLS)
- Type: Progressive Web App
- Design reference: Google Stitch UI mockups

## Authentication System (built and working)

- Login by University ID, not typed email: `BU22CSC1080` (student) or
  `BUI/ACAD/SS/0427` (staff) — regex-validated
- Real Bowen University email (`@bowen.edu.ng`) required at sign-up as an
  anti-forgery measure — this triggers Supabase's native confirmation email
- A small `id_lookup` table maps ID → bowen_email, since login happens by
  ID but Supabase Auth's actual identity is the verified email
- Public sign-up always creates students. Admin role is never
  self-granted — promoted manually via SQL by the developer:

  ```sql
  update auth.users set raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'::jsonb
  where email = 'their-bowen-email@bowen.edu.ng';
  ```

- Guest mode allowed for the optimizer (no account needed)
- Role-based routing: students/guests → `/optimizer`, admins → `/admin`
  (hard route guard, admin route inaccessible otherwise)

## Database Schema (Supabase)

| Table | Purpose |
|---|---|
| `cafeterias` | 8 cafeterias: BBSF, Jubilee, Blessed, Y2k, Divine, Kemi Bee, Forza, Sumptuous |
| `food_items` | 22 standard menu items (swallows, grains, proteins, sides, 4 free soups) |
| `cafeteria_items` | Per-cafeteria specialties and price overrides |
| `nbs_prices` | 39 months of real NBS food price data, Osun State, Jan 2023–Mar 2026 |
| `saved_plans` | Student favorites — one-click saved meals |
| `id_lookup` | Maps Matric/Staff ID → verified bowen email, for ID-based login |

A Postgres function `menu_for_cafeteria(cafe_id)` returns each cafeteria's
effective menu (standard items + overrides + specialties merged).

## The Optimization Engine (Bounded Knapsack)

**Core rule set (auto-optimizer mode):**

- One base per meal: Swallow OR Rice & Grains OR Beans OR Spaghetti
- Swallow → free soup auto-added (best of 4: Egusi, Efo Riro, Ewedu, Okro —
  Kemi Bee also has Gbegiri); no plantain; no Sausage/Moimoi
- Rice/Spaghetti/Beans → plantain allowed, no free soup
- Protein portions ≤ base portions, max 2 protein types, max 3 total pieces
- Cravings get an internal scoring bonus (never shown in displayed satiety
  — kept separate to avoid showing fake numbers like "1049/100")

**Manual adjustment mode (student fine-tunes the result):**

- Base/swallow portions: freely adjustable, governed only by budget (not
  the realistic-suggestion ceiling)
- Protein: can be swapped (dropdown of compatible options) and
  quantity-adjusted independently of base — the strict ratio rule is
  relaxed here, only budget and cultural compatibility (e.g., no Sausage
  with a swallow) still apply

**Output metrics:**

- Satiety Score (0–100): normalized against a "very filling" reference
  meal (~44 raw satiety points)
- Budget Utilization %: how much of the allotted budget was spent
- Budget Slack: leftover amount with realistic price-tier messages
  (sachet water ₦50–99, bottle water ₦250–499, soft drink ₦500+)

## Student-Facing Screens

| Screen | Purpose |
|---|---|
| Login/Signup | ID-based auth, bowen email verification |
| Meal Optimizer | Cafeteria selector, budget input, appetite (Light/Normal/Large), full-menu craving/avoiding chips, "Optimize My Meal" |
| Result | Itemized receipt-style breakdown, manual +/- portion adjustment, protein swap, Satiety Score, Budget Slack, "Why this meal?" explanation, one-click Save to Favorites |
| Favorites | Saved meal plans, re-build or delete |
| Price Analytics | NBS index chart with May 2023 fuel subsidy marker, cafeteria cost comparison, item-by-item price trends, volatility table |

## Admin-Only Dashboard (role-gated, completely separate route)

| Section | Purpose |
|---|---|
| KPI strip | Cafeterias managed, menu items, NBS series tracked, Supabase connection status |
| Student Purchasing Power Impact | Real finding: tracks Rice+Beans+Yam staple basket, shows a fixed ₦1,500/day budget buys 70.9% less food now than Jan 2023 — strongest BI talking point |
| Campus Price Regulation | Admin can edit actual prices students pay across all cafeterias, inline edit/save, separate from NBS reference data |
| Monthly NBS Reference Update | Form to enter new NBS prices, with realistic min/max range validation (catches typos before they corrupt the dataset) |
| Submission History | Log of all NBS price entries by month |
| Volatility Rankings | Highest price-instability items, ranked |
| Cafeteria Registry | Full table of all 8 cafeterias, their specialties, overrides |

## Key Technical Lessons

- Supabase RPC returns snake_case (`max_portions`, `is_free`) — the engine
  needs camelCase. Always normalize at the data-fetching layer, never
  assume field names match.
- RLS policies cannot query `auth.users` directly — use
  `auth.jwt() -> 'user_metadata' ->> 'role'` instead, never
  `select ... from auth.users`.
- `updateUser({ email })` requires an active session — don't use it to
  verify a secondary email right after signup if email confirmation is ON.
  Instead, use the target email directly as the Auth email so Supabase's
  native confirmation flow handles it.
- Keep the local `dataset.js` fallback in sync with whatever's seeded in
  Supabase — drift between them causes confusing "works locally, breaks
  live" bugs (this happened with the soup redesign).

## Build Order

1. Schema/auth
2. Student optimizer
3. Result page
4. Admin dashboard (last — depends on the same data layer being solid first)

Test the engine logic in isolation (Node scripts) before wiring it to UI.
Keep the two-table price model (`food_items` for standard menu,
`cafeteria_items` for specialties) — clean, avoids duplicating 22 items × 8
cafeterias.

---

**See `CLAUDE.md` in this same folder for current build status, fixes
already applied, and what's left to do.**
