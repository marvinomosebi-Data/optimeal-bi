import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CAFETERIAS, getCheapestMealCost, MEAL_TYPES } from "../data/dataset.js";
import { Star, MapPin, TrendingDown, ChevronRight, Sunrise, Sun, Moon, Leaf, Utensils, Soup } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

const MEAL_ICONS = { breakfast: Sunrise, lunch: Sun, dinner: Moon };
const MEAL_COLORS = {
  breakfast: { active: "bg-amber-500 text-white",   border: "border-amber-300 dark:border-amber-700",   icon: "text-amber-500",   light: "bg-amber-50 dark:bg-amber-950/30"   },
  lunch:     { active: "bg-emerald-500 text-white",  border: "border-emerald-300 dark:border-emerald-700", icon: "text-emerald-500", light: "bg-emerald-50 dark:bg-emerald-950/30" },
  dinner:    { active: "bg-indigo-500 text-white",   border: "border-indigo-300 dark:border-indigo-700",  icon: "text-indigo-500",  light: "bg-indigo-50 dark:bg-indigo-950/30"  },
};
const APPETITE_OPTS = [
  { key: "Light",  icon: Leaf,     desc: "Light eater"  },
  { key: "Normal", icon: Utensils, desc: "Regular meal" },
  { key: "Large",  icon: Soup,     desc: "Very hungry"  },
];

function getActiveMealByTime() {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 12) return "breakfast";
  if (hour >= 12 && hour < 16) return "lunch";
  if (hour >= 16 && hour <= 20) return "dinner";
  return "lunch";
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= Math.round(rating) ? "fill-gold text-gold" : "text-slate-300 dark:text-slate-600"}`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function Plan() {
  const navigate    = useNavigate();
  const { session } = useAuth();

  const [activeMeal, setActiveMeal] = useState(getActiveMealByTime());
  const [budget, setBudget]         = useState("");
  const [appetite, setAppetite]     = useState("Normal");

  const budgetNum  = Number(budget) || 0;
  const hasBudget  = budget !== "";
  const canSuggest = budgetNum >= 400;

  const feasible = useMemo(() => {
    if (budgetNum < 400) return [];
    return CAFETERIAS
      .filter(c => getCheapestMealCost(c.id) <= budgetNum)
      .sort((a, b) => b.rating - a.rating);
  }, [budgetNum]);

  const userName = session?.user?.user_metadata?.full_name?.split(" ")[0] || "there";

  function goToOptimizer(cafe) {
    navigate(
      `/app/optimizer?budget=${budget}&cafe=${cafe.id}&meal=${activeMeal}&appetite=${appetite}&crave=&avoid=`
    );
  }

  const mc       = MEAL_COLORS[activeMeal];
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

      {/* Meal type tabs — icon + label only */}
      <div className="flex gap-2 mb-5">
        {Object.values(MEAL_TYPES).map(mt => {
          const Icon     = MEAL_ICONS[mt.key];
          const col      = MEAL_COLORS[mt.key];
          const isActive = activeMeal === mt.key;
          return (
            <button
              key={mt.key}
              onClick={() => setActiveMeal(mt.key)}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition border ${
                isActive
                  ? `${col.active} border-transparent shadow-sm`
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{mt.label}</span>
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

        {/* Budget input */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">
            How much can you spend on this meal?
          </label>
          <div className="flex items-center rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 focus-within:border-navy dark:focus-within:border-blue-400 transition">
            <span className="mr-2 font-display text-2xl font-bold text-slate-400">₦</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={budget}
              onChange={e => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="w-full bg-transparent font-display text-2xl font-bold text-ink dark:text-slate-100 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
          {hasBudget && budgetNum > 0 && !canSuggest && (
            <p className="mt-2 text-xs text-amber-600 font-medium">
              ⚠️ Minimum budget for a meal is ₦400
            </p>
          )}
          {canSuggest && (
            <p className="mt-2 text-xs text-emerald-600 font-medium">
              ✓ ₦{budgetNum.toLocaleString()} budget — showing cafeteria options below
            </p>
          )}
        </div>

        {/* Appetite — Optimizer-style icon cards */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">
            Appetite level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {APPETITE_OPTS.map(({ key, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => setAppetite(key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 text-xs font-semibold transition ${
                  appetite === key
                    ? "border-gold bg-gold text-navy-900 shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{key}</span>
                <span className={`text-[10px] font-normal ${appetite === key ? "text-navy-900/70" : "text-slate-400"}`}>
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cafeteria list */}
      {hasBudget && budgetNum > 0 && (
        canSuggest ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              Recommended Cafeterias (₦{budgetNum.toLocaleString()}/meal)
            </p>
            {feasible.length > 0 ? (
              <div className="space-y-2">
                {feasible.map(cafe => (
                  <button
                    key={cafe.id}
                    onClick={() => goToOptimizer(cafe)}
                    className="w-full text-left card p-4 hover:border-navy dark:hover:border-blue-500 transition-all group flex items-center gap-4"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-white font-bold text-sm">
                      {cafe.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink dark:text-slate-100 text-sm">{cafe.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />{cafe.side}
                        </span>
                        <StarRating rating={cafe.rating} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                        <TrendingDown className="h-3 w-3" /> Fits budget
                      </p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-navy dark:group-hover:text-blue-400 ml-auto mt-1 transition" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="card p-5 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No cafeterias fit this budget. Try increasing your amount.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-5 text-center">
            <p className="text-sm text-amber-600 font-medium">
              ⚠️ Budget too low. Minimum is ₦400 for a meal.
            </p>
          </div>
        )
      )}

      {/* Empty state */}
      {(!hasBudget || budgetNum === 0) && (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <MealIcon className="h-7 w-7 text-slate-400" />
          </div>
          <p className="font-semibold text-ink dark:text-slate-100">Enter your budget above</p>
          <p className="mt-1 text-sm text-slate-400">
            We'll show you the best cafeterias for your meal
          </p>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
