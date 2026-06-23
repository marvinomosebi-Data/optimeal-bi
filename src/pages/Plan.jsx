import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CAFETERIAS, getCheapestMealCost, getMenuForCafeteria, MEAL_TYPES } from "../data/dataset.js";
import { optimizeMeal } from "../lib/optimizer.js";
import { Star, MapPin, TrendingDown, TrendingUp, Minus, ChevronRight, Sunrise, Sun, Moon, Utensils } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

const MEAL_ICONS  = { breakfast: Sunrise, lunch: Sun, dinner: Moon };
const MEAL_COLORS = {
  breakfast: { active: "bg-amber-500 text-white",   border: "border-amber-300 dark:border-amber-700",   icon: "text-amber-500", light: "bg-amber-50 dark:bg-amber-950/30" },
  lunch:     { active: "bg-emerald-500 text-white",  border: "border-emerald-300 dark:border-emerald-700", icon: "text-emerald-500", light: "bg-emerald-50 dark:bg-emerald-950/30" },
  dinner:    { active: "bg-indigo-500 text-white",   border: "border-indigo-300 dark:border-indigo-700",  icon: "text-indigo-500", light: "bg-indigo-50 dark:bg-indigo-950/30" },
};
const APPETITE_OPTS = ["Light", "Normal", "Large"];

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`h-3 w-3 ${s <= Math.round(rating) ? "fill-gold text-gold" : "text-slate-300 dark:text-slate-600"}`} />
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{rating.toFixed(1)}</span>
    </div>
  );
}

function getSuggestions(budget, appetite) {
  if (!budget || budget < 400) return { cheapest: [], topRated: [] };
  const scored = CAFETERIAS.map(cafe => {
    const menu = getMenuForCafeteria(cafe.id);
    const result = optimizeMeal({ menu, budget, appetite, crave: new Set(), avoid: new Set() });
    if (!result?.feasible) return null;
    return { cafe, cost: result.totalCost, savings: budget - result.totalCost };
  }).filter(Boolean);
  if (!scored.length) return { cheapest: [], topRated: [] };
  return {
    cheapest: [...scored].sort((a, b) => a.cost - b.cost).slice(0, 3),
    topRated: [...scored].sort((a, b) => b.cafe.rating - a.cafe.rating).slice(0, 3),
  };
}

export default function Plan() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [activeMeal, setActiveMeal] = useState("lunch");
  const [budgets, setBudgets]       = useState({ breakfast: "", lunch: "", dinner: "" });
  const [appetite, setAppetite]     = useState("Normal");

  const rawVal = budgets[activeMeal];
  const budget = rawVal === "" ? 0 : Math.max(0, parseInt(rawVal.replace(/\D/g, ""), 10) || 0);
  const { cheapest, topRated } = useMemo(() => getSuggestions(budget, appetite), [budget, appetite]);

  const userName = session?.user?.user_metadata?.full_name?.split(" ")[0] || "there";

  function handleBudgetChange(e) {
    // Only allow digits, no spin buttons behavior
    const val = e.target.value.replace(/[^0-9]/g, "");
    setBudgets(b => ({ ...b, [activeMeal]: val }));
  }

  function goToOptimizer(cafe) {
    const params = new URLSearchParams({
      budget: String(budget),
      appetite,
      cafe: String(cafe.id),
      meal: activeMeal,
      crave: "",
      avoid: "",
    });
    navigate(`/app/optimizer?${params}`);
  }

  const mc = MEAL_COLORS[activeMeal];
  const MealIcon = MEAL_ICONS[activeMeal];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 w-full">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-extrabold text-ink dark:text-slate-100">
          Hey {userName} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          What are you eating today? Set your budget and we'll find the best meal for you.
        </p>
      </div>

      {/* Meal type tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {Object.values(MEAL_TYPES).map(mt => {
          const Icon = MEAL_ICONS[mt.key];
          const col  = MEAL_COLORS[mt.key];
          const isActive = activeMeal === mt.key;
          return (
            <button
              key={mt.key}
              onClick={() => setActiveMeal(mt.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition border ${
                isActive
                  ? `${col.active} border-transparent shadow-sm`
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {mt.label}
              <span className={`text-xs ${isActive ? "opacity-70" : "text-slate-400"}`}>{mt.hours}</span>
            </button>
          );
        })}
      </div>

      {/* Budget + Appetite card */}
      <div className={`card p-5 mb-5 border-l-4 ${mc.border}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`grid h-8 w-8 place-items-center rounded-lg ${mc.light}`}>
            <MealIcon className={`h-4 w-4 ${mc.icon}`} />
          </div>
          <p className="font-semibold text-ink dark:text-slate-100">
            {MEAL_TYPES[activeMeal.toUpperCase()]?.label} Budget
          </p>
        </div>

        {/* Budget input — text type to prevent spin button navigation */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">
            How much can you spend?
          </label>
          <div className="flex items-center rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 focus-within:border-navy dark:focus-within:border-blue-400 transition">
            <span className="mr-2 font-display text-2xl font-bold text-slate-400">₦</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rawVal}
              onChange={handleBudgetChange}
              placeholder="0"
              className="w-full bg-transparent font-display text-2xl font-bold text-ink dark:text-slate-100 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
          {budget > 0 && budget < 400 && (
            <p className="mt-2 text-xs text-amber-600 font-medium">⚠️ Minimum for a meal is ₦400</p>
          )}
          {budget >= 400 && (
            <p className="mt-2 text-xs text-emerald-600 font-medium">✓ Budget of ₦{budget.toLocaleString()} — showing cafeteria suggestions below</p>
          )}
        </div>

        {/* Appetite */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">
            Appetite level
          </label>
          <div className="flex gap-2">
            {APPETITE_OPTS.map(a => (
              <button
                key={a}
                onClick={() => setAppetite(a)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition border ${
                  appetite === a
                    ? "bg-navy text-white border-navy"
                    : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {budget >= 400 && (
        <div className="space-y-5">
          {cheapest.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                💰 Best Value Cafeterias
              </p>
              <div className="space-y-2">
                {cheapest.map((item, i) => (
                  <CafeCard key={item.cafe.id} item={item} budget={budget} rank={i+1} badge="value" onSelect={goToOptimizer} />
                ))}
              </div>
            </div>
          )}
          {topRated.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                ⭐ Top Rated Cafeterias
              </p>
              <div className="space-y-2">
                {topRated.map((item, i) => (
                  <CafeCard key={item.cafe.id} item={item} budget={budget} rank={i+1} badge="rated" onSelect={goToOptimizer} />
                ))}
              </div>
            </div>
          )}
          {cheapest.length === 0 && (
            <div className="card p-5 text-center">
              <Utensils className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Budget too low for any cafeteria. Try ₦500 or more.</p>
            </div>
          )}
        </div>
      )}

      {budget === 0 && (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <MealIcon className="h-7 w-7 text-slate-400" />
          </div>
          <p className="font-semibold text-ink dark:text-slate-100">Enter your budget above</p>
          <p className="mt-1 text-sm text-slate-400">We'll show you the best cafeterias for your budget</p>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}

function CafeCard({ item, budget, rank, badge, onSelect }) {
  const { cafe, cost, savings } = item;
  return (
    <button
      onClick={() => onSelect(cafe)}
      className="w-full text-left card p-4 hover:border-navy dark:hover:border-blue-400 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy text-white font-bold text-sm">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-ink dark:text-slate-100 text-sm">{cafe.name}</p>
            {badge === "value" && (
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Best Value</span>
            )}
            {badge === "rated" && (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold-dark">Top Rated</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3 w-3" />{cafe.side}
            </span>
            <StarRating rating={cafe.rating} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg font-bold text-ink dark:text-slate-100">₦{cost.toLocaleString()}</p>
          {savings > 0 ? (
            <p className="flex items-center justify-end gap-0.5 text-xs font-semibold text-emerald-600">
              <TrendingDown className="h-3 w-3" /> Save ₦{savings.toLocaleString()}
            </p>
          ) : savings === 0 ? (
            <p className="flex items-center justify-end gap-0.5 text-xs text-slate-400">
              <Minus className="h-3 w-3" /> Exact
            </p>
          ) : (
            <p className="flex items-center justify-end gap-0.5 text-xs font-semibold text-amber-600">
              <TrendingUp className="h-3 w-3" /> Tight
            </p>
          )}
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-navy dark:group-hover:text-blue-400 ml-auto mt-0.5 transition" />
        </div>
      </div>
    </button>
  );
}
