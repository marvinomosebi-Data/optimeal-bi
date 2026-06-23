import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/Topbar.jsx";
import { Footer } from "./Optimizer.jsx";
import { CAFETERIAS, getCheapestMealCost, getMenuForCafeteria, CATEGORIES, MEAL_TYPES } from "../data/dataset.js";
import { optimizeMeal } from "../lib/optimizer.js";
import { Star, MapPin, TrendingDown, TrendingUp, Minus, ChevronRight, Sunrise, Sun, Moon, CheckCircle2 } from "lucide-react";

const MEAL_ICONS = { breakfast: Sunrise, lunch: Sun, dinner: Moon };
const MEAL_COLORS = {
  breakfast: "from-amber-400 to-orange-400",
  lunch:     "from-emerald-400 to-teal-500",
  dinner:    "from-indigo-500 to-purple-600",
};

function getMealSuggestions(budget, mealKey) {
  if (!budget || budget < 100) return { cheapest: [], topRated: [] };

  const scored = CAFETERIAS.map((cafe) => {
    const menu = getMenuForCafeteria(cafe.id);
    const result = optimizeMeal({ menu, budget, appetite: "Normal", crave: new Set(), avoid: new Set() });
    const cheapest = getCheapestMealCost(cafe.id);
    const feasible = result?.feasible ?? false;
    const cost = result?.totalCost ?? cheapest;
    const savings = budget - cost;
    const satiety = result?.satietyScore ?? 0;
    return { cafe, cost, savings, satiety, feasible, result };
  }).filter(s => s.feasible);

  if (scored.length === 0) return { cheapest: [], topRated: [] };

  const cheapest = [...scored].sort((a, b) => a.cost - b.cost).slice(0, 3);
  const topRated = [...scored].sort((a, b) => b.cafe.rating - a.cafe.rating).slice(0, 3);

  return { cheapest, topRated };
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "fill-gold text-gold" : "text-slate-300"}`} />
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-600">{rating.toFixed(1)}</span>
    </div>
  );
}

function CafeCard({ item, budget, mealKey, rank, type, onSelect }) {
  const { cafe, cost, savings } = item;
  const savingsPct = budget > 0 ? Math.round((savings / budget) * 100) : 0;

  return (
    <button
      onClick={() => onSelect(cafe, cost, mealKey)}
      className="w-full text-left card p-4 hover:border-navy hover:shadow-cardhover transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${MEAL_COLORS[mealKey]} text-white font-bold text-sm`}>
            {rank}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-ink truncate">{cafe.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-400 truncate">{cafe.side}</span>
            </div>
            <div className="mt-1">
              <StarRating rating={cafe.rating} />
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg font-bold text-ink">₦{cost.toLocaleString()}</p>
          {savings > 0 ? (
            <p className="flex items-center justify-end gap-0.5 text-xs font-semibold text-emerald-600">
              <TrendingDown className="h-3 w-3" /> Save ₦{savings.toLocaleString()} ({savingsPct}%)
            </p>
          ) : savings === 0 ? (
            <p className="flex items-center justify-end gap-0.5 text-xs font-semibold text-slate-400">
              <Minus className="h-3 w-3" /> Exact budget
            </p>
          ) : (
            <p className="flex items-center justify-end gap-0.5 text-xs font-semibold text-amber-600">
              <TrendingUp className="h-3 w-3" /> Tight budget
            </p>
          )}
          {type === "cheapest" && (
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              💰 Best Value
            </span>
          )}
          {type === "rated" && (
            <span className="mt-1 inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold-dark">
              ⭐ Top Rated
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-2.5">
        <span>Tap to view full meal plan</span>
        <ChevronRight className="h-4 w-4 group-hover:text-navy transition-colors" />
      </div>
    </button>
  );
}

function MealBudgetCard({ mealType, budget, onBudgetChange, isActive, onToggle }) {
  const Icon = MEAL_ICONS[mealType.key];
  const suggestions = useMemo(() => getMealSuggestions(Number(budget), mealType.key), [budget, mealType.key]);
  const hasSuggestions = (suggestions.cheapest.length + suggestions.topRated.length) > 0;
  const navigate = useNavigate();

  function handleSelect(cafe, cost, mealKey) {
    const params = new URLSearchParams({
      budget: String(budget),
      appetite: "Normal",
      cafe: String(cafe.id),
      crave: "",
      avoid: "",
      meal: mealKey,
    });
    navigate(`/app/optimizer?${params}`);
  }

  return (
    <div className={`card overflow-hidden transition-all ${isActive ? "ring-2 ring-navy" : ""}`}>
      {/* Header */}
      <div
        className={`bg-gradient-to-r ${MEAL_COLORS[mealType.key]} p-4 cursor-pointer`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-white">{mealType.label}</p>
              <p className="text-xs text-white/80">{mealType.hours}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {budget && Number(budget) > 0 && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white">
                ₦{Number(budget).toLocaleString()}
              </span>
            )}
            <div
              className={`h-5 w-5 rounded-full border-2 border-white flex items-center justify-center transition-all ${isActive ? "bg-white" : "bg-transparent"}`}
            >
              {isActive && <CheckCircle2 className="h-4 w-4 text-navy" />}
            </div>
          </div>
        </div>
      </div>

      {/* Budget input — always visible */}
      <div className="p-4 border-b border-slate-100">
        <label className="text-sm font-semibold text-ink block mb-2">
          Budget for {mealType.label}
        </label>
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-navy focus-within:bg-white focus-within:ring-2 focus-within:ring-navy/10 transition">
          <span className="mr-2 font-display text-xl font-bold text-slate-400">₦</span>
          <input
            type="number"
            min={0}
            step={100}
            value={budget}
            onChange={(e) => onBudgetChange(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent font-display text-2xl font-bold text-ink outline-none"
          />
        </div>
        {budget && Number(budget) > 0 && Number(budget) < 400 && (
          <p className="mt-2 text-xs font-medium text-amber-600">
            ⚠️ Minimum for a basic meal is ₦400. Try at least ₦500.
          </p>
        )}
      </div>

      {/* Suggestions */}
      {isActive && budget && Number(budget) >= 400 && (
        <div className="p-4 space-y-4">
          {/* Cheapest */}
          {suggestions.cheapest.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
                💰 Best Value Cafeterias
              </p>
              <div className="space-y-2">
                {suggestions.cheapest.map((item, i) => (
                  <CafeCard key={item.cafe.id} item={item} budget={Number(budget)} mealKey={mealType.key} rank={i + 1} type="cheapest" onSelect={handleSelect} />
                ))}
              </div>
            </div>
          )}

          {/* Top rated */}
          {suggestions.topRated.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
                ⭐ Top Rated Cafeterias
              </p>
              <div className="space-y-2">
                {suggestions.topRated.map((item, i) => (
                  <CafeCard key={item.cafe.id} item={item} budget={Number(budget)} mealKey={mealType.key} rank={i + 1} type="rated" onSelect={handleSelect} />
                ))}
              </div>
            </div>
          )}

          {!hasSuggestions && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
              Budget too low for any cafeteria. Try at least ₦{Math.min(...CAFETERIAS.map(c => getCheapestMealCost(c.id))).toLocaleString()}.
            </div>
          )}
        </div>
      )}

      {/* Prompt to enter budget */}
      {isActive && (!budget || Number(budget) < 400) && (
        <div className="p-4 text-center text-sm text-slate-400">
          Enter a budget above ₦400 to see cafeteria suggestions
        </div>
      )}
    </div>
  );
}

export default function Plan() {
  const [budgets, setBudgets] = useState({ breakfast: "", lunch: "", dinner: "" });
  const [active, setActive]   = useState({ breakfast: true, lunch: true, dinner: true });

  function toggleMeal(key) {
    setActive(a => ({ ...a, [key]: !a[key] }));
  }

  function setBudget(key, val) {
    setBudgets(b => ({ ...b, [key]: val }));
    if (!active[key]) setActive(a => ({ ...a, [key]: true }));
  }

  const totalBudget = Object.entries(budgets)
    .filter(([k]) => active[k])
    .reduce((s, [, v]) => s + (Number(v) || 0), 0);

  return (
    <>
      <Topbar title="Plan Your Meal" />
      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8 overflow-x-hidden w-full">

        {/* Header */}
        <div className="mb-6">
          <h2 className="font-display text-2xl font-extrabold text-ink lg:text-3xl">
            What are you eating today?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Set your budget for each meal. We'll find the best cafeteria for you.
          </p>
          {totalBudget > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-1.5 text-sm font-bold text-white">
              Total today: ₦{totalBudget.toLocaleString()}
            </div>
          )}
        </div>

        {/* Meal cards */}
        <div className="space-y-4">
          {Object.values(MEAL_TYPES).map((mt) => (
            <MealBudgetCard
              key={mt.key}
              mealType={mt}
              budget={budgets[mt.key]}
              onBudgetChange={(v) => setBudget(mt.key, v)}
              isActive={active[mt.key]}
              onToggle={() => toggleMeal(mt.key)}
            />
          ))}
        </div>

        <Footer />
      </div>
    </>
  );
}
