// Data service: single access point for the UI.
// Falls back to the bundled dataset when Supabase isn't configured, so the
// PWA is fully functional offline and during development.

import { supabase, isSupabaseConfigured } from "./supabase.js";
import { CAFETERIAS, getMenuForCafeteria } from "../data/dataset.js";
import nbs from "../data/nbsPrices.json";

// Supabase's RPC returns raw Postgres columns (snake_case): max_portions,
// is_free, dual_role. The optimizer engine and UI were written against the
// bundled dataset's camelCase shape (maxPortions, isFree, dualRole). Without
// this normalization, every live-Supabase menu silently breaks the engine —
// maxPortions comes back undefined, so the base-portion loop never runs and
// the optimizer returns ₦0 / 0 satiety regardless of budget.
function normalizeMenuItem(row) {
  const item = {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price) || 0,
    satiety: Number(row.satiety) || 0,
    maxPortions: row.maxPortions ?? row.max_portions ?? 1,
    isFree: row.isFree ?? row.is_free ?? false,
    dualRole: row.dualRole ?? row.dual_role ?? false,
    note: row.note ?? "",
  };
  // Defensive guard: a paid item with maxPortions < 1 means the optimizer's
  // portion loop cannot run for it at all — this is the exact failure mode
  // that previously caused ₦0/0-satiety results. Surface it loudly instead
  // of letting it fail silently.
  if (!item.isFree && item.maxPortions < 1) {
    console.error("[OptiMeal] Menu item has invalid maxPortions — engine cannot use it:", item);
  }
  return item;
}

export async function fetchCafeterias() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("cafeterias").select("*").order("id");
    if (!error && data?.length) return data;
  }
  return CAFETERIAS;
}

export async function fetchMenu(cafeId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("menu_for_cafeteria", { cafe: cafeId });
    if (error) {
      console.error("[OptiMeal] menu_for_cafeteria RPC failed, falling back to local data:", error);
    } else if (!data?.length) {
      console.warn("[OptiMeal] menu_for_cafeteria returned no rows for cafe", cafeId, "— falling back to local data. Check that seed.sql actually ran.");
    } else {
      console.log("[OptiMeal] Loaded", data.length, "menu items from Supabase for cafe", cafeId);
      return data.map(normalizeMenuItem);
    }
  }
  return getMenuForCafeteria(cafeId);
}

export function getPriceSeries(itemName) {
  return nbs.series[itemName] || [];
}

export function getAllSeriesNames() {
  return Object.keys(nbs.series);
}

export function getPriceSummary() {
  return nbs.summary;
}

// Average index across all tracked items at the latest month — used for KPI cards.
export function getIndexSnapshot() {
  const s = nbs.summary;
  const avg = Math.round(s.reduce((a, b) => a + b.latest, 0) / s.length);
  const mostVolatile = [...s].sort((a, b) => b.volatility - a.volatility)[0];
  const avgMom = (s.reduce((a, b) => a + b.mom, 0) / s.length).toFixed(1);
  return { avg, mostVolatile, avgMom };
}

// Submit a full month of NBS prices — called by the admin price update form.
// rows = [{ item_name, price_naira, unit, month, year, zone }]
export async function submitNbsPrices(rows) {
  if (!supabase) throw new Error("Supabase not configured — cannot write price data.");
  const { error } = await supabase.from("nbs_prices").insert(rows);
  if (error) throw error;
}

// Fetch the last N submissions from Supabase so admin can see recent entries.
export async function fetchRecentNbsEntries(limit = 30) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("nbs_prices")
    .select("*")
    .order("year", { ascending: false })
    .order("id",   { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}
/* ── Student Impact Analysis ──────────────────────────────────────────
   Translates raw NBS price movement into something a panel/admin actually
   cares about: how has a FIXED student daily budget's real buying power
   changed over the tracked period? We track a representative campus
   "staple basket" (rice, beans, yam — the cheapest filling bases) and see
   how many kg-equivalent portions a fixed ₦1,500 budget buys, month by month. */
const STAPLE_BASKET = ["Rice (Local)", "Beans (Brown)", "Yam (Tuber)"];
const STUDENT_DAILY_BUDGET = 1500;

export function getStudentImpact() {
  const base = nbs.series[STAPLE_BASKET[0]] || [];
  const timeline = base.map((_, idx) => {
    const prices = STAPLE_BASKET.map((item) => nbs.series[item]?.[idx]?.price).filter(Boolean);
    const avgKgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    // How many kg-equivalents of the staple basket ₦1,500 buys this month.
    const portionsAffordable = avgKgPrice > 0 ? +(STUDENT_DAILY_BUDGET / avgKgPrice).toFixed(2) : 0;
    return { label: base[idx].label, avgKgPrice: Math.round(avgKgPrice), portionsAffordable };
  });

  const first = timeline[0];
  const latest = timeline[timeline.length - 1];
  const purchasingPowerChangePct = first
    ? +(((latest.portionsAffordable - first.portionsAffordable) / first.portionsAffordable) * 100).toFixed(1)
    : 0;

  return {
    timeline,
    first, latest,
    purchasingPowerChangePct,           // negative = budget buys LESS than before
    dailyBudget: STUDENT_DAILY_BUDGET,
  };
}

export function getBlendedIndex(items = ["Rice (Local)", "Beef (Boneless)", "Gari (Yellow)", "Yam (Tuber)"]) {
  const base = nbs.series[items[0]] || [];
  return base.map((_, idx) => {
    const vals = items.map((n) => nbs.series[n]?.[idx]?.price).filter(Boolean);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { label: base[idx].label, value: Math.round(avg) };
  });
}

/* ── Campus price regulation (admin only) ─────────────────────────────
   Lets the admin update what students actually PAY in cafeterias, in
   response to NBS national food-price movements. Two tables: food_items
   (the standard menu) and cafeteria_items (per-cafeteria overrides). */

// All standard menu items as currently stored in Supabase, for the admin's
// price-editing table.
export async function fetchAllFoodItems() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from("food_items").select("*").order("category").order("name");
  if (error) return [];
  return data || [];
}

// Update one standard menu item's campus price.
export async function updateFoodItemPrice(itemId, newPrice) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("food_items").update({ price: newPrice }).eq("id", itemId);
  if (error) throw error;
}

// All per-cafeteria specialty/override items, for the admin's price-editing table.
export async function fetchAllCafeteriaItems() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from("cafeteria_items").select("*").order("cafe_id").order("name");
  if (error) return [];
  return data || [];
}

// Update one cafeteria-specific item's price (specialty or override).
export async function updateCafeteriaItemPrice(cafeId, itemId, newPrice) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("cafeteria_items")
    .update({ price: newPrice }).eq("cafe_id", cafeId).eq("item_id", itemId);
  if (error) throw error;
}