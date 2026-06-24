import { useState } from "react";
import { CalendarDays, Calendar } from "lucide-react";

const MODES = [
  { key: "weekly",  label: "Weekly",  days: 7,  icon: CalendarDays },
  { key: "monthly", label: "Monthly", days: 30, icon: Calendar },
];

export default function Budget() {
  const [mode, setMode]   = useState("weekly");
  const [total, setTotal] = useState("");

  const days     = mode === "weekly" ? 7 : 30;
  const totalNum = Number(total) || 0;
  const per2meal = totalNum > 0 ? Math.floor(totalNum / (days * 2)) : 0;
  const per3meal = totalNum > 0 ? Math.floor(totalNum / (days * 3)) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 overflow-x-hidden w-full">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-extrabold text-ink dark:text-slate-100">
          Budget Planner
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Set your weekly or monthly food budget and see how much you have per meal.
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={total}
            onChange={e => setTotal(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={mode === "weekly" ? "e.g. 20000" : "e.g. 80000"}
            className="w-full bg-transparent font-display text-2xl font-bold text-ink dark:text-slate-100 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Per-meal breakdown */}
      {totalNum > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            Per Meal Breakdown — {days}-day {mode}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card p-4 text-center">
              <p className="font-display text-2xl font-bold text-ink dark:text-slate-100">
                ₦{per2meal.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Per Meal</p>
              <p className="text-[11px] text-slate-400 mt-0.5">2 meals/day (÷{days * 2})</p>
            </div>
            <div className="card p-4 text-center">
              <p className="font-display text-2xl font-bold text-ink dark:text-slate-100">
                ₦{per3meal.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Per Meal</p>
              <p className="text-[11px] text-slate-400 mt-0.5">3 meals/day (÷{days * 3})</p>
            </div>
          </div>

          <div className="rounded-xl bg-navy/5 dark:bg-navy/20 border border-navy/10 p-4 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-ink dark:text-slate-100 mb-1">📋 Your {mode} meal plan</p>
            <p>
              <strong>₦{totalNum.toLocaleString()}</strong> over <strong>{days} days</strong> gives you{" "}
              <strong>₦{per2meal.toLocaleString()}/meal</strong> at 2 meals a day, or{" "}
              <strong>₦{per3meal.toLocaleString()}/meal</strong> at 3 meals a day.
            </p>
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
