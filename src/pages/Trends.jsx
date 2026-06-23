import { useEffect, useMemo, useState } from "react";
import { Footer } from "./Optimizer.jsx";
import { getBlendedIndex, getIndexSnapshot, getPriceSummary, getAllSeriesNames, getPriceSeries } from "../lib/dataService.js";
import { CAFETERIAS, getMenuForCafeteria } from "../data/dataset.js";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, RefreshCw } from "lucide-react";

const RANGES = { "12M": 12, "24M": 24, "All": 999 };

/* Purchasing-power: how many portions ₦1500 buys of a staple */
function purchasingPower() {
  const summary = getPriceSummary();
  const rice  = summary.find((s) => s.item === "Rice (Local)");
  const beans = summary.find((s) => s.item === "Beans (Brown)");
  const yam   = summary.find((s) => s.item === "Yam (Tuber)");
  // campus price per portion: rice 300, beans 300, yam/swallow 300
  // NBS price is per kg; campus price tracks it roughly at 1:1 movement
  const budget = 1500;
  return {
    rice:  rice  ? Math.floor(budget / 300 * (1 - rice.mom  / 100)).toFixed(1) : "—",
    beans: beans ? Math.floor(budget / 300 * (1 - beans.mom / 100)).toFixed(1) : "—",
    yam:   yam   ? Math.floor(budget / 300 * (1 - yam.mom   / 100)).toFixed(1) : "—",
  };
}

/* Cafeteria avg-meal cost index */
function cafeteriaIndex() {
  return CAFETERIAS.map((c) => {
    const menu    = getMenuForCafeteria(c.id);
    const swallow = menu.find((m) => m.id === "pounded_yam");
    const protein = menu.find((m) => m.id === "beef");
    const fish    = menu.find((m) => m.id === "small_fish");
    const total   = (swallow?.price || 0) + (protein?.price || 0) * 2 + (fish?.price || 0);
    return { name: c.code, full: c.name, value: total };
  });
}

function volBadge(mom) {
  if (mom > 3)  return { label: `+${mom.toFixed(1)}%`, cls: "text-red-600",     Icon: ArrowUpRight };
  if (mom < -1) return { label: `${mom.toFixed(1)}%`,  cls: "text-emerald-600", Icon: ArrowDownRight };
  return             { label: "Stable",                  cls: "text-emerald-600", Icon: Minus };
}

/* May-2023 subsidy label index — find it in the blended series */
const SUBSIDY_LABEL = "May 23";

export default function Trends() {
  const [range, setRange]         = useState("12M");
  const snapshot                  = useMemo(() => getIndexSnapshot(), []);
  const cafeData                  = useMemo(() => cafeteriaIndex(), []);
  const summary                   = useMemo(() => getPriceSummary(), []);
  const power                     = useMemo(() => purchasingPower(), []);

  const lineData = useMemo(() => {
    const n = RANGES[range];
    return getBlendedIndex().slice(-n);
  }, [range]);

  /* multi-item comparison series */
  const compSeries = useMemo(() => {
    const keys = ["Rice (Local)", "Beef (Boneless)", "Beans (Brown)", "Yam (Tuber)"];
    const base  = getPriceSeries(keys[0]);
    return base.slice(-RANGES[range]).map((pt, i) => {
      const obj = { label: pt.label };
      keys.forEach((k) => { obj[k] = getPriceSeries(k)[i]?.price ?? null; });
      return obj;
    });
  }, [range]);

  /* live KPIs from NBS data */
  const avgMealCost = useMemo(() => {
    const latest = summary.find((s) => s.item === "Rice (Local)")?.latest;
    // campus meal: rice ₦300 base + proportional increase from NBS trend
    const base   = 300 + (summary.find((s) => s.item === "Beef (Boneless)")?.latest ?? 0) * 0.15;
    return Math.round(base / 10) * 10;
  }, [summary]);

  const subsidy = snapshot.mostVolatile;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 overflow-x-hidden w-full">

        {/* KPI row */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Meal Cost (NBS-based)</p>
            <p className="mt-2 font-display text-4xl font-extrabold text-ink">₦{avgMealCost.toLocaleString()}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-red-600">
              <ArrowUpRight className="h-4 w-4" /> {Math.abs(+snapshot.avgMom)}% avg monthly change
            </p>
          </div>
          <div className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highest Inflation Item</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-ink">{subsidy.item}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
              <AlertTriangle className="h-4 w-4" /> {subsidy.volatility}% price volatility
            </p>
          </div>
          <div className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">₦1,500 Buys Today (portions)</p>
            <div className="mt-2 flex gap-4">
              {[["Rice", power.rice], ["Beans", power.beans], ["Yam", power.yam]].map(([k, v]) => (
                <div key={k} className="text-center">
                  <p className="font-display text-2xl font-extrabold text-navy">{v}</p>
                  <p className="text-xs text-slate-500">{k}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Down from ~5 portions in Jan 2023</p>
          </div>
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* NBS blended index */}
          <section className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold text-ink">NBS Food Price Index — Osun State</h3>
                <p className="mt-1 text-xs text-slate-500">Blended average: Rice · Beef · Beans · Yam</p>
              </div>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1 shrink-0">
                {Object.keys(RANGES).map((r) => (
                  <button key={r} onClick={() => setRange(r)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${range===r ? "bg-navy text-white" : "text-slate-500"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ left:-10, right:10 }}>
                  <defs>
                    <linearGradient id="navyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#0B1F3A" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#0B1F3A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize:11, fill:"#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} tickLine={false} axisLine={false} width={55}
                    tickFormatter={(v) => `₦${(v/1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={{ borderRadius:12, border:"1px solid #e2e8f0", fontSize:12 }}
                    formatter={(v) => [`₦${v.toLocaleString()}`, "Avg price"]} />
                  <ReferenceLine x={SUBSIDY_LABEL} stroke="#ef4444" strokeDasharray="4 3"
                    label={{ value:"Subsidy removed", position:"top", fontSize:10, fill:"#ef4444" }} />
                  <Area type="monotone" dataKey="value" stroke="#0B1F3A" strokeWidth={2.5}
                    fill="url(#navyFill)" dot={{ r:2, fill:"#F5C84B", stroke:"#0B1F3A" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Cafeteria price index bar */}
          <section className="card p-6">
            <h3 className="font-display text-xl font-bold text-ink">Cafeteria Average Meal Cost</h3>
            <p className="mt-1 text-xs text-slate-500">Pounded Yam + Beef ×2 + Small Fish (standard plan)</p>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cafeData} margin={{ left:-10, right:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:"#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} tickLine={false} axisLine={false} width={55}
                    tickFormatter={(v) => `₦${v.toLocaleString()}`} />
                  <Tooltip cursor={{ fill:"#f1f5f9" }} contentStyle={{ borderRadius:12, border:"1px solid #e2e8f0", fontSize:12 }}
                    formatter={(v) => [`₦${v.toLocaleString()}`, "Avg meal"]}
                    labelFormatter={(l) => cafeData.find((c) => c.name===l)?.full || l} />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {cafeData.map((_, i) => <Cell key={i} fill={i%3===2 ? "#F5C84B" : "#0B1F3A"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Multi-item line comparison */}
        <section className="card mt-6 p-6">
          <h3 className="font-display text-xl font-bold text-ink">Item-by-Item Price Comparison</h3>
          <p className="mt-1 text-xs text-slate-500">Monthly NBS prices (Osun State) — Jan 2023 to Mar 2026</p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compSeries} margin={{ left:-10, right:10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize:10, fill:"#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} tickLine={false} axisLine={false} width={60}
                  tickFormatter={(v) => `₦${(v/1000).toFixed(1)}k`} />
                <Tooltip contentStyle={{ borderRadius:12, border:"1px solid #e2e8f0", fontSize:12 }}
                  formatter={(v, n) => [`₦${v?.toLocaleString()}`, n]} />
                <Legend wrapperStyle={{ fontSize:12 }} />
                <ReferenceLine x={SUBSIDY_LABEL} stroke="#ef4444" strokeDasharray="4 3" />
                {["Rice (Local)","Beef (Boneless)","Beans (Brown)","Yam (Tuber)"].map((k,i) => (
                  <Line key={k} type="monotone" dataKey={k} strokeWidth={2}
                    stroke={["#0B1F3A","#F5C84B","#10b981","#6366f1"][i]}
                    dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Red dashed line = May 2023 Nigerian fuel subsidy removal. Prices rose sharply across all food categories from this point.
          </p>
        </section>

        {/* Price table */}
        <section className="card mt-6 overflow-hidden">
          <div className="flex items-center justify-between p-6">
            <h3 className="font-display text-xl font-bold text-ink">NBS Price Volatility Table</h3>
            <span className="chip bg-emerald-100 text-emerald-700">{summary.length} items tracked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Item (NBS)</th>
                  <th className="px-6 py-3">Latest Price</th>
                  <th className="px-6 py-3">Month-on-Month</th>
                  <th className="px-6 py-3">12-Month Volatility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.map((s) => {
                  const b = volBadge(s.mom);
                  return (
                    <tr key={s.item} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-semibold text-ink">{s.item}</td>
                      <td className="px-6 py-4 font-semibold text-ink">₦{s.latest.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 font-semibold ${b.cls}`}>
                          <b.Icon className="h-4 w-4" /> {b.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-navy"
                              style={{ width:`${Math.min(100,(s.volatility/30)*100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{s.volatility}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
