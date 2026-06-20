-- OptiMeal BI — Supabase schema
-- Run in the Supabase SQL editor. Mirrors the bundled dataset so the app can
-- switch from local mode to live mode by setting the VITE_SUPABASE_* env vars.

create table if not exists cafeterias (
  id          int primary key,
  name        text not null,
  location    text not null,
  code        text not null,
  zone        text default 'Bowen University'
);

create table if not exists food_items (
  id            text primary key,
  name          text not null,
  category      text not null,          -- Swallow | Rice & Grains | Protein | Side | Soup
  price         int  not null,
  satiety       int  not null,
  max_portions  int  not null default 1,
  is_free       boolean default false,
  dual_role     boolean default false,
  note          text
);

-- Per-cafeteria specialty additions and price overrides.
create table if not exists cafeteria_items (
  cafe_id       int references cafeterias(id) on delete cascade,
  item_id       text not null,          -- may be a new specialty id or an existing food_items id
  name          text not null,
  category      text not null,
  price         int  not null,
  satiety       int  not null,
  max_portions  int  not null default 1,
  is_override   boolean default false,  -- true = overrides a standard item price
  dual_role     boolean default false,
  is_free       boolean default false,
  note          text,
  primary key (cafe_id, item_id)
);

-- NBS Osun State raw-food monthly price history.
create table if not exists nbs_prices (
  id          bigserial primary key,
  item_name   text not null,
  price_naira numeric not null,
  unit        text,
  month       text not null,
  year        int  not null,
  zone        text default 'Osun State'
);

-- Saved optimized plans per user (optional, for the Save Plan action).
create table if not exists saved_plans (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  cafe_id     int references cafeterias(id),
  budget      int not null,
  appetite    text not null,
  items       jsonb not null,
  total_cost  int not null,
  satiety_score int not null,
  created_at  timestamptz default now()
);

-- Effective menu for a cafeteria = standard items (with overrides) + additions.
create or replace function menu_for_cafeteria(cafe int)
returns table (
  id text, name text, category text, price int, satiety int,
  max_portions int, is_free boolean, dual_role boolean, note text
) language sql stable as $$
  with overrides as (
    select item_id, price from cafeteria_items
    where cafe_id = cafe and is_override
  )
  select f.id, f.name, f.category,
         coalesce(o.price, f.price) as price,
         f.satiety, f.max_portions, f.is_free, f.dual_role, f.note
  from food_items f
  left join overrides o on o.item_id = f.id
  union all
  select c.item_id, c.name, c.category, c.price, c.satiety,
         c.max_portions, c.is_free, c.dual_role, c.note
  from cafeteria_items c
  where c.cafe_id = cafe and not c.is_override;
$$;

-- Read access for the app (anon). Writes go through authenticated admin policies.
alter table cafeterias       enable row level security;
alter table food_items       enable row level security;
alter table cafeteria_items  enable row level security;
alter table nbs_prices       enable row level security;
alter table saved_plans      enable row level security;

-- NOTE: Postgres has no "CREATE POLICY IF NOT EXISTS" — that clause only
-- exists for things like CREATE TABLE. To make this script safely
-- re-runnable, every policy below is dropped first (if it exists) and then
-- created fresh. This is the standard idempotent pattern for policies.

drop policy if exists "public read cafeterias"     on cafeterias;
drop policy if exists "public read food_items"      on food_items;
drop policy if exists "public read cafeteria_items" on cafeteria_items;
drop policy if exists "public read nbs_prices"      on nbs_prices;
drop policy if exists "owner read plans"            on saved_plans;
drop policy if exists "owner insert plans"          on saved_plans;

create policy "public read cafeterias"      on cafeterias      for select using (true);
create policy "public read food_items"       on food_items      for select using (true);
create policy "public read cafeteria_items"  on cafeteria_items for select using (true);
create policy "public read nbs_prices"        on nbs_prices      for select using (true);
create policy "owner read plans"   on saved_plans for select using (auth.uid() = user_id);
create policy "owner insert plans" on saved_plans for insert with check (auth.uid() = user_id);

-- ===== Added: favorites support + bowen.edu.ng email verification =====

-- Saved plans need a label and a way to be deleted by their owner.
alter table saved_plans add column if not exists plan_name text;
alter table saved_plans add column if not exists cafe_name text;

drop policy if exists "owner delete plans" on saved_plans;
create policy "owner delete plans"
on saved_plans for delete using (auth.uid() = user_id);

-- Track whether the bowen.edu.ng email tied to an account has been verified.
-- (The actual verification email is sent via Supabase Auth's own email-change
-- flow; this column just lets the app show a "Verified" badge / gate features.)

-- Admins can update campus menu prices (regulation feature).
-- NOTE: RLS policies cannot query auth.users directly (the anon/authenticated
-- roles aren't granted select on it, so a policy that tries silently fails
-- closed). The role lives in the JWT itself once a user is signed in, so we
-- read it from auth.jwt() -> 'user_metadata' instead — no extra table lookup,
-- and it actually works.
drop policy if exists "admin update food_items" on food_items;
create policy "admin update food_items"
on food_items for update
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin update cafeteria_items" on cafeteria_items;
create policy "admin update cafeteria_items"
on cafeteria_items for update
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Admin can submit new monthly NBS reference prices (Monthly NBS Reference
-- Update form). This was missing entirely — nbs_prices only had a public
-- SELECT policy, so every insert from the admin form hit RLS and failed
-- with "new row violates row-level security policy for table nbs_prices".
drop policy if exists "admin insert nbs_prices" on nbs_prices;
create policy "admin insert nbs_prices"
on nbs_prices for insert
with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ===== Added: id_lookup table (referenced by src/lib/supabase.js but never
--       created — sign-up's insert into id_lookup, and sign-in's select from
--       it, would both fail on a fresh database without this). =====
--
-- Maps a typed University ID to the real bowen.edu.ng email that is the
-- actual Supabase Auth identity, so login can happen by ID while Auth still
-- works on email under the hood.
create table if not exists id_lookup (
  id_number     text primary key,            -- e.g. BU22CSC1080 or BUI/ACAD/SS/0427
  bowen_email   text not null unique,
  user_id       uuid references auth.users(id) on delete cascade,
  created_at    timestamptz default now()
);

alter table id_lookup enable row level security;

-- Sign-in needs to resolve ID -> email BEFORE a session exists, and sign-up
-- needs to insert that mapping right after auth.signUp() (also typically
-- before a confirmed session). Both happen pre-auth, so both policies are
-- intentionally open to anon. The bowen.edu.ng email-confirmation gate is
-- the actual anti-forgery control, not this table's RLS.
drop policy if exists "public read id_lookup" on id_lookup;
create policy "public read id_lookup"
on id_lookup for select using (true);

drop policy if exists "public insert id_lookup" on id_lookup;
create policy "public insert id_lookup"
on id_lookup for insert with check (true);