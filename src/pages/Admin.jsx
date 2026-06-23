import { useState, useEffect, useMemo } from "react";
import { Footer } from "./Optimizer.jsx";
import { CAFETERIAS, STANDARD_MENU } from "../data/dataset.js";
import { isSupabaseConfigured } from "../lib/supabase.js";
import { useNotifications } from "../lib/notifications.jsx";
import {
  getPriceSummary, getIndexSnapshot, submitNbsPrices, fetchRecentNbsEntries,
  getStudentImpact, fetchAllFoodItems, updateFoodItemPrice,
  fetchAllCafeteriaItems, updateCafeteriaItemPrice,
} from "../lib/dataService.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ShieldCheck, Database, Store, TrendingUp, TrendingDown, CheckCircle2, AlertCircle,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Users, Pencil, Save, X,
} from "lucide-react";

/* ── All NBS items the system tracks, with their unit of measurement ── */
const NBS_ITEMS = [
  { name:"Beans (Brown)",     unit:"1 kg" },
  { name:"Beef (Boneless)",   unit:"1 kg" },
  { name:"Bread (Sliced)",    unit:"loaf" },
  { name:"Chicken (Frozen)",  unit:"1 kg" },
  { name:"Egg (Medium)",      unit:"1 piece" },
  { name:"Gari (White)",      unit:"1 kg" },
  { name:"Gari (Yellow)",     unit:"1 kg" },
  { name:"Onion",             unit:"1 kg" },
  { name:"Palm Oil",          unit:"1 litre" },
  { name:"Rice (Local)",      unit:"1 kg" },
  { name:"Sweet Potato",      unit:"1 kg" },
  { name:"Titus Fish (Frozen)",unit:"1 kg" },
  { name:"Tomato",            unit:"1 kg" },
  { name:"Vegetable Oil",     unit:"1 litre" },
  { name:"Yam (Tuber)",       unit:"1 kg" },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear  = new Date().getFullYear();
const currentMonth = MONTHS[new Date().getMonth()];
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

/* ============================================================
   SECTION 1 — Student Impact: how NBS prices affect campus students
   ============================================================ */
function StudentImpactSection() {
  const impact = useMemo(() => getStudentImpact(), []);
  const eroded = impact.purchasingPowerChangePct < 0;

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 bg-navy px-6 py-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gold" />
          <h3 className="font-display text-xl font-bold text-white">Student Purchasing Power Impact</h3>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          How national food-price movement affects what a fixed ₦{impact.dailyBudget.toLocaleString()}/day student budget can actually buy
        </p>
      </div>

      <div className="p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Jan 2023 buying power</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-ink">{impact.first.portionsAffordable}<span className="text-base font-medium text-slate-400"> kg-units</span></p>
            <p className="mt-1 text-xs text-slate-400">of staple food (rice, beans, yam) per ₦{impact.dailyBudget.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Now ({impact.latest.label}) buying power</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-ink">{impact.latest.portionsAffordable}<span className="text-base font-medium text-slate-400"> kg-units</span></p>
            <p className="mt-1 text-xs text-slate-400">same basket, same ₦{impact.dailyBudget.toLocaleString()} budget</p>
          </div>
          <div className={`rounded-xl border p-5 ${eroded ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net change</p>
            <p className={`mt-2 flex items-center gap-1.5 font-display text-3xl font-extrabold ${eroded ? "text-red-600" : "text-emerald-600"}`}>
              {eroded ? <TrendingDown className="h-7 w-7" /> : <TrendingUp className="h-7 w-7" />}
              {Math.abs(impact.purchasingPowerChangePct)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {eroded ? "less food a fixed budget can now buy" : "more food a fixed budget can now buy"}
            </p>
          </div>
        </div>

        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={impact.timeline} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="impactFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B1F3A" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0B1F3A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                interval={Math.ceil(impact.timeline.length / 10)} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={50}
                label={{ value: "kg-units affordable", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v) => [`${v} kg-units`, `₦${impact.dailyBudget} buys`]} />
              <ReferenceLine x="May 23" stroke="#ef4444" strokeDasharray="4 3"
                label={{ value: "Subsidy removed", position: "top", fontSize: 10, fill: "#ef4444" }} />
              <Area type="monotone" dataKey="portionsAffordable" stroke="#0B1F3A" strokeWidth={2.5} fill="url(#impactFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Basket: Rice (Local), Beans (Brown), Yam (Tuber) — the cheapest filling staples students rely on most.
          A falling line means students need more money for the same meal, even with no change in their habits.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   SECTION 2 — Campus Price Regulation: admin edits what students pay
   ============================================================ */
function PriceRow({ item, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.price);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  async function commit() {
    const num = Number(val);
    if (!num || num < 0) { setErr("Enter a valid price"); return; }
    setSaving(true); setErr("");
    try {
      await onSave(num);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (ex) {
      setErr(ex.message || "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-4 py-3 font-medium text-ink">{item.name}</td>
      <td className="px-4 py-3 text-slate-400">{item.category}</td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-400">₦</span>
            <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
              className="w-24 rounded-lg border border-navy/30 px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-navy/15" autoFocus />
          </div>
        ) : (
          <span className={`font-semibold ${item.price === 0 ? "text-emerald-600" : "text-ink"}`}>
            {item.price === 0 ? "Free" : `₦${Number(item.price).toLocaleString()}`}
          </span>
        )}
        {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
      </td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <div className="inline-flex gap-1.5">
            <button onClick={commit} disabled={saving} className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => { setEditing(false); setVal(item.price); setErr(""); }} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : saved ? (
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
        ) : (
          <button onClick={() => setEditing(true)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

function CampusPriceRegulation({ refreshKey, bumpRefresh }) {
  const [items, setItems] = useState([]);
  const [cafeItems, setCafeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAllFoodItems(), fetchAllCafeteriaItems()]).then(([fi, ci]) => {
      setItems(fi); setCafeItems(ci); setLoading(false);
    });
  }, [refreshKey]);

  const filteredItems = items.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()));
  const filteredCafeItems = cafeItems.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()));

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
        <strong>Supabase not configured.</strong> Connect a database to regulate live campus prices.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Adjust what students pay across campus in response to NBS food-price movement. Changes apply instantly to the optimizer.
        </p>
        <input
          placeholder="Search item…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading menu prices…</p>
      ) : (
        <div className="mt-4 space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Standard Menu (applies to all cafeterias)</p>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr><th className="px-4 py-2.5">Item</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Price</th><th className="px-4 py-2.5"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((item) => (
                    <PriceRow key={item.id} item={item} onSave={async (newPrice) => {
                      await updateFoodItemPrice(item.id, newPrice);
                      try { localStorage.setItem("optimeal_prices_last_updated", String(Date.now())); } catch(_) {}
                      bumpRefresh();
                    }} />
                  ))}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No items match "{filter}"</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {cafeItems.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Cafeteria Specialties & Overrides</p>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                    <tr><th className="px-4 py-2.5">Item</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Price</th><th className="px-4 py-2.5"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCafeItems.map((item) => (
                      <PriceRow key={`${item.cafe_id}-${item.item_id}`} item={item} onSave={async (newPrice) => {
                        await updateCafeteriaItemPrice(item.cafe_id, item.item_id, newPrice);
                        bumpRefresh();
                      }} />
                    ))}
                    {filteredCafeItems.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No items match "{filter}"</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SECTION 3 — NBS Monthly Update Form (reference data, kept from before)
   ============================================================ */
function PriceUpdateForm({ onSuccess }) {
  const [month, setMonth]   = useState(currentMonth);
  const [year, setYear]     = useState(currentYear);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);
  const [errMsg, setErrMsg]   = useState("");
  // Snapshot of how many prices were actually submitted, captured at submit
  // time. NOT the same as `filled` below — `filled` is derived live from the
  // form fields, so it recalculates to 0 the instant the form clears after a
  // successful save, which made the success banner always say "0 prices
  // saved" regardless of how many were really submitted.
  const [savedCount, setSavedCount] = useState(0);

  function setPrice(name, val) { setPrices((p) => ({ ...p, [name]: val })); }
  const filled  = NBS_ITEMS.filter((i) => prices[i.name] && Number(prices[i.name]) > 0).length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (filled === 0) { setErrMsg("Enter at least one price before submitting."); setStatus("err"); return; }
    setLoading(true); setStatus(null);
    try {
      const rows = NBS_ITEMS
        .filter((i) => prices[i.name] && Number(prices[i.name]) > 0)
        .map((i) => ({ item_name: i.name, price_naira: Number(prices[i.name]), unit: i.unit, month, year: Number(year), zone: "Osun State" }));
      await submitNbsPrices(rows);
      setSavedCount(rows.length);
      setStatus("ok"); setPrices({});
      // Mark prices as updated for notification system
      try { localStorage.setItem("optimeal_prices_last_updated", String(Date.now())); } catch(_) {}
      onSuccess?.();
    } catch (ex) {
      setErrMsg(ex.message || "Submission failed. Check your connection.");
      setStatus("err");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/10">
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/10">
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <span className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${filled === NBS_ITEMS.length ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {filled}/{NBS_ITEMS.length} filled
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NBS_ITEMS.map((item) => {
          const val = prices[item.name] || "";
          const isFilled = val && Number(val) > 0;
          return (
            <div key={item.name} className={`rounded-xl border p-3 transition ${isFilled ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
              <label className="block text-xs font-semibold text-ink">{item.name}</label>
              <p className="mb-2 text-[11px] text-slate-400">{item.unit} · Osun State</p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-400">₦</span>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={val}
                  onChange={(e) => setPrice(item.name, e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm font-semibold outline-none transition ${isFilled ? "border-emerald-300 bg-white text-ink focus:ring-2 focus:ring-emerald-200" : "border-slate-200 bg-slate-50 text-ink focus:border-navy focus:ring-2 focus:ring-navy/10"}`} />
              </div>
            </div>
          );
        })}
      </div>

      {status === "ok" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {savedCount} price{savedCount !== 1 ? "s" : ""} for {month} {year} saved successfully.
        </div>
      )}
      {status === "err" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <AlertCircle className="h-5 w-5 shrink-0" /> {errMsg}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={loading || filled === 0} className="btn-primary disabled:opacity-50">
          {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="h-4 w-4" /> Submit {filled > 0 ? `${filled} price${filled > 1 ? "s" : ""}` : "prices"}</>}
        </button>
        <p className="text-xs text-slate-400">You can submit partial data — only filled fields are saved.</p>
      </div>
    </form>
  );
}

function RecentEntries({ refresh }) {
  const [entries, setEntries] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRecentNbsEntries(30).then((d) => { setEntries(d); setLoading(false); });
  }, [refresh]);

  const groups = useMemo(() => {
    const map = {};
    entries.forEach((e) => { const key = `${e.month} ${e.year}`; (map[key] ??= []).push(e); });
    return Object.entries(map);
  }, [entries]);

  if (loading) return <p className="py-4 text-sm text-slate-400">Loading recent entries…</p>;
  if (!entries.length) return <p className="py-4 text-sm text-slate-400">No price submissions yet.</p>;

  const visible = expanded ? groups : groups.slice(0, 2);
  return (
    <div className="space-y-4">
      {visible.map(([period, rows]) => (
        <div key={period}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">{period}</span>
            <span className="text-xs text-slate-400">{rows.length} items</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-2.5">Item</th><th className="px-4 py-2.5">Unit</th><th className="px-4 py-2.5">Price (₦)</th><th className="px-4 py-2.5">Zone</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-ink">{r.item_name}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.unit}</td>
                    <td className="px-4 py-2.5 font-semibold text-ink">₦{Number(r.price_naira).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.zone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {groups.length > 2 && (
        <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline">
          {expanded ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Show {groups.length - 2} more period{groups.length - 2 > 1 ? "s" : ""}</>}
        </button>
      )}
    </div>
  );
}

/* ============================================================
   MAIN ADMIN PAGE
   ============================================================ */
export default function Admin() {
  const summary  = useMemo(() => getPriceSummary(), []);
  const [refreshKey, setRefreshKey] = useState(0);
  const topVolatile = [...summary].sort((a, b) => b.volatility - a.volatility).slice(0, 3);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 space-y-6 overflow-x-hidden w-full">

        {/* KPI strip */}
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
          <div className="card p-6">
            <Store className="h-7 w-7 text-navy" />
            <p className="mt-3 font-display text-3xl font-extrabold text-ink">{CAFETERIAS.length}</p>
            <p className="text-sm text-slate-500">Managed cafeterias</p>
          </div>
          <div className="card p-6">
            <Database className="h-7 w-7 text-navy" />
            <p className="mt-3 font-display text-3xl font-extrabold text-ink">{STANDARD_MENU.length}</p>
            <p className="text-sm text-slate-500">Standard menu items</p>
          </div>
          <div className="card p-6">
            <TrendingUp className="h-7 w-7 text-navy" />
            <p className="mt-3 font-display text-3xl font-extrabold text-ink">{summary.length}</p>
            <p className="text-sm text-slate-500">NBS price series tracked</p>
          </div>
          <div className="card p-6">
            <ShieldCheck className="h-7 w-7 text-navy" />
            <p className={`mt-3 font-display text-3xl font-extrabold ${isSupabaseConfigured ? "text-emerald-600" : "text-amber-600"}`}>
              {isSupabaseConfigured ? "Live" : "Local"}
            </p>
            <p className="text-sm text-slate-500">{isSupabaseConfigured ? "Supabase connected" : "Bundled dataset"}</p>
          </div>
        </div>

        {/* SECTION 1: Student Impact */}
        <StudentImpactSection />

        {/* SECTION 2: Campus Price Regulation */}
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-navy px-6 py-5">
            <h3 className="font-display text-xl font-bold text-white">Campus Price Regulation</h3>
            <p className="mt-1 text-sm text-slate-400">Increase or decrease what students pay, in response to national food prices.</p>
          </div>
          <div className="p-6">
            <CampusPriceRegulation refreshKey={refreshKey} bumpRefresh={() => setRefreshKey((k) => k + 1)} />
          </div>
        </section>

        {/* SECTION 3: NBS reference data update */}
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-navy px-6 py-5">
            <h3 className="font-display text-xl font-bold text-white">Monthly NBS Reference Update</h3>
            <p className="mt-1 text-sm text-slate-400">Enter the latest Osun State food prices from the NBS monthly report.</p>
          </div>
          <div className="p-6">
            {isSupabaseConfigured ? (
              <PriceUpdateForm onSuccess={() => setRefreshKey((k) => k + 1)} />
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                <strong>Supabase not configured.</strong> Add your credentials to the <code>.env</code> file.
              </div>
            )}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-navy px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Submission History</h3>
              <p className="mt-1 text-sm text-slate-400">
                {isSupabaseConfigured ? "Recent NBS price entries logged to Supabase" : "Connect Supabase to view submission history"}
              </p>
            </div>
            <button onClick={() => setRefreshKey((k) => k + 1)} className="flex items-center gap-1.5 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          <div className="p-6">
            {isSupabaseConfigured ? <RecentEntries refresh={refreshKey} /> : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                <strong>Supabase not configured.</strong> Add your credentials to the <code>.env</code> file to view submission history.
              </div>
            )}
          </div>
        </section>

        {/* Top volatile items */}
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-navy px-6 py-5">
            <h3 className="font-display text-xl font-bold text-white">Highest Volatility Items</h3>
            <p className="mt-1 text-sm text-slate-400">Top 3 items needing the closest attention for campus price adjustments</p>
          </div>
          <div className="p-6 space-y-3">
            {topVolatile.map((s, i) => (
              <div key={s.item} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${i === 0 ? "bg-red-100 text-red-600" : i === 1 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-ink">{s.item}</p>
                  <p className="text-sm text-slate-500">Latest: ₦{s.latest.toLocaleString()} · MoM: {s.mom > 0 ? "+" : ""}{s.mom.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-red-600">{s.volatility}%</p>
                  <p className="text-xs text-slate-400">volatility</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cafeteria registry */}
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-navy px-6 py-5">
            <h3 className="font-display text-xl font-bold text-white">Cafeteria Registry</h3>
            <p className="mt-1 text-sm text-slate-400">All {CAFETERIAS.length} managed cafeterias, their specialties and price overrides</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-6 py-3">Cafeteria</th><th className="px-6 py-3">Location</th><th className="px-6 py-3">Specialty Items</th><th className="px-6 py-3">Price Overrides</th><th className="px-6 py-3">Total Items</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CAFETERIAS.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-semibold text-ink">{c.name}</td>
                    <td className="px-6 py-4 text-slate-500">{c.location}</td>
                    <td className="px-6 py-4 text-slate-600">{c.additions.length ? c.additions.map((a) => a.name).join(", ") : "Standard only"}</td>
                    <td className="px-6 py-4 text-slate-600">{Object.keys(c.overrides).length ? Object.entries(c.overrides).map(([k, v]) => `${STANDARD_MENU.find((m) => m.id === k)?.name ?? k} → ₦${v.price}`).join(", ") : "—"}</td>
                    <td className="px-6 py-4 font-semibold text-ink">{STANDARD_MENU.length + c.additions.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}