import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, ShoppingBag } from "lucide-react";
import { fetchSavedPlans } from "../lib/supabase.js";
import { useState, useEffect } from "react";

function getWeekRange(weeksAgo = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - dayOfWeek - weeksAgo * 7);
  startOfThisWeek.setHours(0,0,0,0);
  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
  endOfThisWeek.setHours(23,59,59,999);
  return { start: startOfThisWeek, end: endOfThisWeek };
}

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Spending() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedPlans().then(data => { setPlans(data); setLoading(false); });
  }, []);

  const thisWeek  = getWeekRange(0);
  const lastWeek  = getWeekRange(1);

  const thisWeekPlans = plans.filter(p => {
    const d = new Date(p.created_at);
    return d >= thisWeek.start && d <= thisWeek.end;
  });
  const lastWeekPlans = plans.filter(p => {
    const d = new Date(p.created_at);
    return d >= lastWeek.start && d <= lastWeek.end;
  });

  const thisTotal = thisWeekPlans.reduce((s, p) => s + (p.total_cost || 0), 0);
  const lastTotal = lastWeekPlans.reduce((s, p) => s + (p.total_cost || 0), 0);
  const diff      = thisTotal - lastTotal;
  const pct       = lastTotal > 0 ? Math.abs(Math.round((diff / lastTotal) * 100)) : 0;

  // Daily breakdown for this week
  const dailyThis = Array(7).fill(0);
  const dailyLast = Array(7).fill(0);
  thisWeekPlans.forEach(p => { const d = new Date(p.created_at).getDay(); dailyThis[d] += p.total_cost || 0; });
  lastWeekPlans.forEach(p => { const d = new Date(p.created_at).getDay(); dailyLast[d] += p.total_cost || 0; });
  const maxBar = Math.max(...dailyThis, ...dailyLast, 1);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-4 border-navy border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 overflow-x-hidden w-full">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-extrabold text-ink dark:text-slate-100">Spending Habits</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Comparing your food spending this week vs last week.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">This Week</p>
          <p className="font-display text-2xl font-bold text-ink dark:text-slate-100">₦{thisTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{thisWeekPlans.length} meals saved</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Last Week</p>
          <p className="font-display text-2xl font-bold text-ink dark:text-slate-100">₦{lastTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{lastWeekPlans.length} meals saved</p>
        </div>
      </div>

      {/* Comparison banner */}
      {(thisTotal > 0 || lastTotal > 0) && (
        <div className={`card p-4 mb-5 flex items-center gap-4 ${
          diff < 0 ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30" :
          diff > 0 ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30" :
          "border-slate-200 dark:border-slate-700"
        }`}>
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
            diff < 0 ? "bg-emerald-100 dark:bg-emerald-900/40" :
            diff > 0 ? "bg-red-100 dark:bg-red-900/40" :
            "bg-slate-100 dark:bg-slate-800"
          }`}>
            {diff < 0 ? <TrendingDown className="h-6 w-6 text-emerald-600" /> :
             diff > 0 ? <TrendingUp className="h-6 w-6 text-red-500" /> :
             <Minus className="h-6 w-6 text-slate-400" />}
          </div>
          <div>
            {diff < 0 ? (
              <>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">Spending less this week! 🎉</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-500">You spent ₦{Math.abs(diff).toLocaleString()} less ({pct}%) than last week.</p>
              </>
            ) : diff > 0 ? (
              <>
                <p className="font-bold text-red-600 dark:text-red-400">Spending more this week</p>
                <p className="text-sm text-red-500 dark:text-red-400">You spent ₦{diff.toLocaleString()} more ({pct}%) than last week.</p>
              </>
            ) : (
              <>
                <p className="font-bold text-slate-600 dark:text-slate-300">Same spending as last week</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your spending is consistent.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bar chart */}
      {(thisTotal > 0 || lastTotal > 0) ? (
        <div className="card p-5 mb-5">
          <p className="text-sm font-bold text-ink dark:text-slate-100 mb-4">Daily Spending Comparison</p>
          <div className="flex items-end gap-1.5 h-32">
            {DAY_LABELS.map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end h-24">
                  {/* Last week bar */}
                  <div
                    className="flex-1 rounded-t-md bg-slate-200 dark:bg-slate-600 transition-all"
                    style={{ height: `${(dailyLast[i] / maxBar) * 100}%`, minHeight: dailyLast[i] > 0 ? "4px" : "0" }}
                    title={`Last week ${day}: ₦${dailyLast[i].toLocaleString()}`}
                  />
                  {/* This week bar */}
                  <div
                    className="flex-1 rounded-t-md bg-navy dark:bg-blue-500 transition-all"
                    style={{ height: `${(dailyThis[i] / maxBar) * 100}%`, minHeight: dailyThis[i] > 0 ? "4px" : "0" }}
                    title={`This week ${day}: ₦${dailyThis[i].toLocaleString()}`}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{day}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-slate-200 dark:bg-slate-600" />Last week</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-navy dark:bg-blue-500" />This week</span>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-ink dark:text-slate-100">No spending data yet</p>
          <p className="mt-1 text-sm text-slate-400">Save meal plans to track your spending habits here.</p>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
