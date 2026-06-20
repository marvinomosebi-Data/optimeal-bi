# OptiMeal BI — Bowen University

Budget-aware campus meal optimizer and food-price analytics, built as an
installable Progressive Web App.

Pick a budget, appetite, and cafeteria; the knapsack engine returns the most
filling meal it can buy within budget while honoring every cafeteria pairing
rule. The analytics dashboard tracks Osun State NBS raw-food prices and a
per-cafeteria price index.

## Stack

- React 18 + Vite (JavaScript)
- Tailwind CSS
- Recharts (area + bar charts)
- React Router
- Supabase (`@supabase/supabase-js`) — optional backend
- `vite-plugin-pwa` — offline-capable, installable

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the build locally
```

The app runs immediately on a bundled local dataset, so no backend is required
for development or offline use.

## Connecting Supabase (optional)

1. Create a Supabase project.
2. Run `supabase/schema.sql` then `supabase/seed.sql` in the SQL editor.
3. Copy `.env.example` to `.env` and fill in:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

When set, `src/lib/dataService.js` reads cafeterias, menus, and prices from
Supabase. With them blank, it falls back to the bundled data — the PWA stays
fully functional offline either way.

## Project structure

```
src/
  data/
    dataset.js        Standard menu, cafeterias, per-cafe overrides/additions
    nbsPrices.json    NBS Osun State price history (generated from CSV)
  lib/
    optimizer.js      Knapsack meal engine + all compatibility rules
    supabase.js       Supabase client (env-gated)
    dataService.js    Single data access layer (Supabase or local fallback)
  components/         AppLayout, Sidebar, Topbar
  pages/              Login, Optimizer, Result, Trends, Admin
supabase/
  schema.sql          Tables, menu_for_cafeteria(), RLS policies
  seed.sql            Generated seed (NBS rows + items + cafe items)
```

## The optimizer engine

`src/lib/optimizer.js` maximizes total satiety subject to the budget, encoding
the rules from the campus food dataset:

- Exactly one base type per meal (Swallow | Rice/Grains | Beans | Spaghetti).
- Swallow -> free soup auto-added; no plantain; no Sausage/Moimoi.
- Rice/Grains -> plantain allowed; no soup; all proteins.
- Spaghetti -> plantain allowed; no soup; no Ponmo/Moimoi.
- Beans -> plantain allowed; no soup; only Egg/Beef/Chicken; dual-role halves
  the protein requirement.
- Total protein portions <= base portions.
- Max 2 protein types, max 3 total protein pieces.
- "Crave" items get a satiety bonus; "Avoid" items are excluded.

## PWA

`vite-plugin-pwa` generates the service worker and web manifest at build time.
After `npm run build`, install from a supported browser. Google Fonts are
runtime-cached; the app shell and assets are precached.

---

(c) 2024 OptiMeal BI — Developed by Omosebi Marvellous Joshua
