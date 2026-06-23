import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Topbar } from "../components/Topbar.jsx";
import { fetchCafeterias, fetchMenu } from "../lib/dataService.js";
import { optimizeMeal } from "../lib/optimizer.js";
import { useAuth } from "../lib/auth.jsx";
import { CATEGORIES, MEAL_TYPES } from "../data/dataset.js";
import { Leaf, Utensils, Soup, Zap, Info, ArrowLeft, Flame } from "lucide-react";

const APPETITE_OPTS = [
  { key: "Light",  icon: Leaf,     desc: "Light eater" },
  { key: "Normal", icon: Utensils, desc: "Regular meal" },
  { key: "Large",  icon: Soup,     desc: "Very hungry"  },
];

/* Category groups for preference chips */
const CHIP_GROUPS = [
  { label: "Swallows & Bases", cats: ["Swallow", "Rice & Grains"] },
  { label: "Proteins",         cats: ["Protein"] },
  { label: "Sides",            cats: ["Side"] },
];

/* Soups shown separately as read-only info — auto-added by engine with swallows */
const SOUP_CAT = "Soup";

export default function Optimizer() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();

  // Read from URL params (set by Plan page) or use defaults
  const initBudget = searchParams.get("budget") || "1500";
  const initCafe   = Number(searchParams.get("cafe")) || 1;
  const initMeal   = searchParams.get("meal") || "lunch";

  const [budget, setBudget]     = useState(initBudget);
  const [appetite, setAppetite] = useState("Normal");
  const [cafes, setCafes]       = useState([]);
  const [cafeId, setCafeId]     = useState(initCafe);
  const [menu, setMenu]         = useState([]);
  const [prefs, setPrefs]       = useState({});

  const mealLabel = Object.values(MEAL_TYPES).find(m => m.key === initMeal)?.label || "Meal";

  useEffect(() => { fetchCafeterias().then(setCafes); }, []);
  useEffect(() => { fetchMenu(cafeId).then(setMenu); setPrefs({}); }, [cafeId]);

  const chipItems = useMemo(() => menu.filter((i) => i.category !== CATEGORIES.SOUP), [menu]);
  const soupItems = useMemo(() => menu.filter((i) => i.category === CATEGORIES.SOUP), [menu]);

  const crave = useMemo(
    () => new Set(Object.entries(prefs).filter(([, v]) => v === "crave").map(([k]) => k)),
    [prefs]
  );
  const avoid = useMemo(
    () => new Set(Object.entries(prefs).filter(([, v]) => v === "avoid").map(([k]) => k)),
    [prefs]
  );

  const preview = useMemo(() => {
    if (!menu.length) return null;
    return optimizeMeal({ menu, budget: Number(budget) || 0, appetite, crave, avoid });
  }, [menu, budget, appetite, crave, avoid]);

  const activeCafe = cafes.find((c) => c.id === cafeId);

  function cycleChip(id) {
    setPrefs((p) => {
      const next = { undefined: "crave", crave: "avoid", avoid: undefined };
      const copy = { ...p };
      const val = next[p[id]];
      if (val === undefined) delete copy[id]; else copy[id] = val;
      return copy;
    });
  }

  function runOptimize() {
    const params = new URLSearchParams({
      budget: String(budget), appetite,
      cafe: String(cafeId),
      crave: [...crave].join(","),
      avoid: [...avoid].join(","),
    });
    navigate(`/app/result?${params}`);
  }

  const userName = session?.user?.user_metadata?.full_name?.split(" ")[0]
    || session?.user?.user_metadata?.id_number
    || "there";

  const budgetNum = Number(budget) || 0;
  const feasible  = preview?.feasible;
  const satScore  = preview?.satietyScore ?? 0;

  return (
    <>
      <Topbar title="Meal Optimizer" />

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 overflow-x-hidden w-full">

        {/* ── Page header ── */}
        <div className="mb-6">
          <button onClick={() => navigate("/app/plan")}
            className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy">
            <ArrowLeft className="h-4 w-4" /> Back to Meal Planner
          </button>
          <h2 className="font-display text-2xl font-extrabold text-ink lg:text-3xl">
            {mealLabel} at <span className="text-gold-dark">{activeCafe?.name ?? "..."}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Customize your preferences and we'll optimize the best meal for your ₦{Number(budget).toLocaleString()} budget.
          </p>
        </div>

        {/* ── Two-column layout: left = config, right = sticky engine ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">

          {/* LEFT COLUMN */}
          <div className="space-y-5">

            {/* Budget + Appetite — side by side */}
            <section className="card p-5">
              <div className="grid gap-5 sm:grid-cols-2">

                {/* Budget */}
                <div>
                  <label className="block text-sm font-semibold text-ink">Daily Budget</label>
                  <p className="mb-3 text-xs text-slate-400">How much can you spend today?</p>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-navy focus-within:bg-white focus-within:ring-2 focus-within:ring-navy/10 transition">
                    <span className="mr-2 font-display text-xl font-bold text-slate-400">₦</span>
                    <input
                      type="number" value={budget} min={0} step={100}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-transparent font-display text-2xl font-bold text-ink outline-none"
                    />
                  </div>
                  {/* Quick pick buttons */}
                  <div className="mt-2 flex gap-2">
                    {[500, 1000, 1500, 2000, 3500].map((v) => (
                      <button key={v} onClick={() => setBudget(v)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          Number(budget) === v
                            ? "bg-navy text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}>
                        ₦{v.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Appetite */}
                <div>
                  <label className="block text-sm font-semibold text-ink">Appetite Level</label>
                  <p className="mb-3 text-xs text-slate-400">How hungry are you?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {APPETITE_OPTS.map(({ key, icon: Icon, desc }) => (
                      <button key={key} onClick={() => setAppetite(key)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 text-xs font-semibold transition ${
                          appetite === key
                            ? "border-gold bg-gold text-navy-900 shadow-sm"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                        }`}>
                        <Icon className="h-5 w-5" />
                        <span>{key}</span>
                        <span className={`text-[10px] font-normal ${appetite === key ? "text-navy-900/70" : "text-slate-400"}`}>{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Cafeteria grid */}
            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">Select Cafeteria</h3>
                  <p className="text-xs text-slate-400">Each cafeteria has its own menu and specials</p>
                </div>
                {activeCafe && (
                  <span className="flex items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy">
                    <MapPin className="h-3.5 w-3.5" /> {activeCafe.location}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {cafes.map((c) => {
                  const active = c.id === cafeId;
                  return (
                    <button key={c.id} onClick={() => setCafeId(c.id)}
                      className={`flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition ${
                        active
                          ? "border-navy bg-navy text-white shadow-cardhover"
                          : "border-slate-200 bg-white text-ink hover:border-slate-300 hover:shadow-card"
                      }`}>
                      <div className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-white/15" : "bg-slate-100"}`}>
                        <Utensils className={`h-4 w-4 ${active ? "text-gold" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight">{c.name}</p>
                        <p className={`mt-0.5 text-[11px] ${active ? "text-slate-300" : "text-slate-400"}`}>{c.location}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Meal preferences chips */}
            <section className="card p-5">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">Meal Preferences</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Tap once to{" "}
                    <span className="font-semibold text-gold-dark">crave</span>
                    {" "}· tap again to{" "}
                    <span className="font-semibold text-red-500">avoid</span>
                    {" "}· tap a third time to clear
                  </p>
                </div>
                {(crave.size > 0 || avoid.size > 0) && (
                  <button onClick={() => setPrefs({})}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                    Clear all
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-5">
                {CHIP_GROUPS.map(({ label, cats }) => {
                  const items = chipItems.filter((i) => cats.includes(i.category));
                  if (!items.length) return null;
                  return (
                    <div key={label}>
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        {label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => {
                          const v = prefs[item.id];
                          return (
                            <button key={item.id} onClick={() => cycleChip(item.id)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                v === "crave"
                                  ? "border-gold bg-gold text-navy-900 shadow-sm"
                                  : v === "avoid"
                                  ? "border-red-200 bg-red-50 text-red-600 line-through"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              }`}>
                              {item.name}
                              <span className={`text-[10px] font-normal ${
                                v === "crave" ? "text-navy-800/70" : v === "avoid" ? "text-red-400" : "text-slate-400"
                              }`}>
                                ₦{item.price}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Soups — selectable like any other item. Auto-added free when you pick a swallow. */}
                {soupItems.length > 0 && (
                  <div>
                    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Free Soups <span className="normal-case font-normal">(served with any swallow — tap to crave or avoid)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {soupItems.map((item) => {
                        const v = prefs[item.id];
                        return (
                          <button key={item.id} onClick={() => cycleChip(item.id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              v === "crave"
                                ? "border-gold bg-gold text-navy-900 shadow-sm"
                                : v === "avoid"
                                ? "border-red-200 bg-red-50 text-red-600 line-through"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                            }`}>
                            <Flame className="h-3.5 w-3.5 shrink-0" />
                            {item.name}
                            <span className={`ml-0.5 text-[10px] font-normal ${
                              v === "crave" ? "text-navy-800/70" : v === "avoid" ? "text-red-400" : "text-emerald-500"
                            }`}>
                              Free
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN — sticky engine panel */}
          <div className="lg:sticky lg:top-20 space-y-4">

            {/* Engine info */}
            <div className="rounded-2xl bg-navy p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Bounded Knapsack Engine
              </p>
              <h3 className="mt-2 font-display text-xl font-bold leading-tight">
                Maximise fullness,<br />not just cost.
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                Finds the combination of foods that gives the highest total satiety within your exact budget — cafeteria-aware, culturally correct.
              </p>

              {/* Live stats */}
              <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Budget</span>
                  <span className="font-bold text-white">₦{budgetNum.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Cafeteria</span>
                  <span className="font-bold text-white">{activeCafe?.name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Craving</span>
                  <span className={`font-bold ${crave.size > 0 ? "text-gold" : "text-slate-500"}`}>
                    {crave.size > 0 ? `${crave.size} item${crave.size > 1 ? "s" : ""}` : "none"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Avoiding</span>
                  <span className={`font-bold ${avoid.size > 0 ? "text-red-400" : "text-slate-500"}`}>
                    {avoid.size > 0 ? `${avoid.size} item${avoid.size > 1 ? "s" : ""}` : "none"}
                  </span>
                </div>
              </div>

              {/* Satiety preview bar */}
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-slate-400">Est. satiety score</span>
                  <span className="font-bold text-white">{satScore}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gold transition-all duration-500"
                    style={{ width: `${Math.max(4, satScore)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Warning only after cafeteria + menu are loaded and budget is genuinely too low */}
            {activeCafe && menu.length > 0 && !feasible && budgetNum > 0 && (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-700">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Budget too low for <strong>{activeCafe.name}</strong>. The cheapest item here is ₦{
                    Math.min(...menu.filter(i => !i.isFree).map(i => i.price)).toLocaleString()
                  } — try at least ₦{
                    Math.min(...menu.filter(i => !i.isFree).map(i => i.price)) + 200
                  } for a basic meal.
                </span>
              </div>
            )}

            {/* Optimize button */}
            <button onClick={runOptimize}
              className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gold py-4 font-display text-lg font-bold text-navy-900 shadow-cardhover transition hover:bg-gold-dark hover:text-white active:scale-[.98]">
              Optimize My Meal
              <Zap className="h-5 w-5 transition group-hover:text-gold" />
            </button>
            <p className="text-center text-xs text-slate-400">
              Runs entirely on your device — no server needed
            </p>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-ink">OptiMeal BI</p>
        <p>© 2025 Developed by Omosebi Marvellous Joshua · BU22CSC1080</p>
      </div>
      <p>Bowen University, Iwo · Final Year Project</p>
    </footer>
  );
}