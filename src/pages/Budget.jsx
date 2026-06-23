import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Calendar, ChevronRight, TrendingDown } from "lucide-react";
import { CAFETERIAS, getCheapestMealCost } from "../data/dataset.js";

const MODES = [
  { key: "weekly",  label: "Weekly",  days: 7,  icon: CalendarDays },
  { key: "monthly", label: "Monthly", days: 30, icon: Calendar },
];

export default function Budget() {
  const navigate = useNavigate();
  const [mode, setMode]       = useState("weekly");
  const [total, setTotal]     = useState("");
  const [appetite, setAppetite] = useState("Normal");

  const days = mode === "weekly" ? 7 : 30;
  const totalNum = Number(total) || 0;
  const perDay = totalNum > 0 ? Math.floor(totalNum / days) : 0;
  const perMeal = perDay > 0 ? Math.floor(perDay / 3) : 0;

  // Find cafeterias that work within per-meal budget
  const feasible = useMemo(() => {
    if (perMeal < 400) return [];
    return CAFETERIAS.filter(c => getCheapestMealCost(c.id) <= perMeal)
      .sort((a, b) => a.rating - b.rating > 0 ? -1 : 1)
      .slice(0, 4);
  }, [perMeal]);

  function goOptimize(cafe) {
    const params = new URLSearchParams({
      budget: String(perMeal),
      appetite,
      cafe: String(cafe.id),
      meal: "lunch",
      crave: "",
      avoid: "",
    });
    navigate(`/app/optimizer?${params}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 overflow-x-hidden w-full">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-extrabold text-ink dark:text-slate-100">
          Budget Planner
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Set your weekly or monthly food budget and we'll plan your meals automatically.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        {MODES.map(m => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition border ${
                mode === m.key
                  ? "bg-navy text-white border-navy"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Budget input */}
      <div className="card p-5 mb-5">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 block">
          Total {mode} food budget
        </label>
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/10 transition">
          <span className="mr-2 font-display text-2xl font-bold text-slate-400">₦</span>
          <input
            type="number"
            min={0}
            step={1000}
            value={total}
            onChange={e => setTotal(e.target.value)}
            placeholder={mode === "weekly" ? "e.g. 20000" : "e.g. 80000"}
            className="w-full bg-transparent font-display text-2xl font-bold text-ink dark:text-slate-100 outline-none"
          />
        </div>

        {/* Appetite */}
        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">
            Appetite level
          </label>
          <div className="flex gap-2">
            {["Light","Normal","Large"].map(a => (
              <button key={a} onClick={() => setAppetite(a)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition border ${
                  appetite === a
                    ? "bg-navy text-white border-navy"
                    : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                }`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {totalNum > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: `Per Day (÷${days})`, value: `₦${perDay.toLocaleString()}` },
              { label: "Per Meal (÷3)",       value: `₦${perMeal.toLocaleString()}` },
              { label: "Total Days",          value: `${days} days` },
            ].map(s => (
              <div key={s.label} className="card p-3 text-center">
                <p className="font-display text-lg font-bold text-ink dark:text-slate-100">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {perMeal >= 400 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                Recommended Cafeterias (₦{perMeal.toLocaleString()}/meal)
              </p>
              <div className="space-y-2">
                {feasible.map(cafe => (
                  <button key={cafe.id} onClick={() => goOptimize(cafe)}
                    className="w-full text-left card p-4 hover:border-navy dark:hover:border-blue-500 transition-all group flex items-center gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-white font-bold text-sm">
                      {cafe.name.slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink dark:text-slate-100 text-sm">{cafe.name}</p>
                      <p className="text-xs text-slate-400">{cafe.side} · ⭐ {cafe.rating}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Fits budget
                      </p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-navy dark:group-hover:text-blue-400 ml-auto transition" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-navy/5 dark:bg-navy/20 border border-navy/10 p-4 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-ink dark:text-slate-100 mb-1">📋 Your {mode} meal plan</p>
                <p>Budget of <strong>₦{totalNum.toLocaleString()}</strong> gives you <strong>₦{perMeal.toLocaleString()}</strong> per meal across <strong>{days} days</strong> (3 meals/day).</p>
              </div>
            </div>
          ) : (
            <div className="card p-5 text-center">
              <p className="text-sm text-amber-600 font-medium">⚠️ Per-meal budget of ₦{perMeal.toLocaleString()} is too low. Try at least ₦{400 * 3 * days} total.</p>
            </div>
          )}
        </>
      )}

      <div className="h-8" />
    </div>
  );
}
