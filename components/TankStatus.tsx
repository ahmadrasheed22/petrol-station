"use client";

import { useState } from "react";
import TankStatusCard, { type TankStatusData } from "@/components/TankStatusCard";

interface TankStatusProps {
  initialTanks: TankStatusData[];
}

export default function TankStatus({ initialTanks }: TankStatusProps) {
  const [calculatorTankId, setCalculatorTankId] = useState(
    initialTanks.length > 0 ? initialTanks[0].id : ""
  );
  const [plannedLiters, setPlannedLiters] = useState("");

  // ── Empty state: no tanks configured ──
  if (initialTanks.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700/50 mb-5">
            <svg className="h-8 w-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-200 mb-2">No Tanks Configured</h3>
          <p className="text-sm text-zinc-400 max-w-md">
            No tanks configured. Please set up your tanks in the{" "}
            <span className="font-medium text-cyan-400">Pump Configuration</span> menu.
          </p>
        </div>
      </div>
    );
  }

  // ── Normal rendering when tanks exist ──
  const calculatorTank = initialTanks.find((tank) => tank.id === calculatorTankId) ?? initialTanks[0];
  const plannedChange = Number.parseFloat(plannedLiters) || 0;
  const projectedLiters = calculatorTank.currentLiters + plannedChange;
  const projectedUllage = calculatorTank.capacityLiters - projectedLiters;
  const projectedPercentage = (projectedLiters / calculatorTank.capacityLiters) * 100;

  const totalCapacity = initialTanks.reduce((acc, t) => acc + t.capacityLiters, 0);
  const totalFuel = initialTanks.reduce((acc, t) => acc + t.currentLiters, 0);
  const totalUllage = totalCapacity - totalFuel;
  const overallPercentage = ((totalFuel / totalCapacity) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Tank Summary Stat Bar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Tank Monitoring (ATG)
              </h3>
              <p className="text-xs text-zinc-400">
                Automated dip gauge readings &amp; current storage volume
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Probes Online
            </span>
          </div>
        </div>

        {/* Global Storage Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center">
            <div className="text-[11px] text-zinc-400">Total Stored</div>
            <div className="text-base font-bold font-mono text-zinc-100 mt-0.5">
              {totalFuel.toLocaleString()} <span className="text-xs text-zinc-500 font-sans">L</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {overallPercentage}% avg capacity
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center">
            <div className="text-[11px] text-zinc-400">Total Ullage (Free)</div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
              {totalUllage.toLocaleString()} <span className="text-xs text-zinc-500 font-sans">L</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Space for incoming tankers
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-center">
            <div className="text-[11px] text-zinc-400">Gross Capacity</div>
            <div className="text-base font-bold font-mono text-zinc-300 mt-0.5">
              {totalCapacity.toLocaleString()} <span className="text-xs text-zinc-500 font-sans">L</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {initialTanks.length} Underground Tank{initialTanks.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-cyan-500/20 bg-zinc-900/70 p-5">
        <div className="mb-4 border-b border-zinc-800 pb-3">
          <h3 className="text-base font-semibold text-white">Tank Inventory Calculator</h3>
          <p className="mt-1 text-xs text-zinc-400">Preview a delivery or withdrawal against current tank levels.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr] md:items-end">
          <div>
            <label htmlFor="calculator-tank" className="mb-1.5 block text-xs font-medium text-zinc-300">Tank</label>
            <select
              id="calculator-tank"
              value={calculatorTankId}
              onChange={(event) => setCalculatorTankId(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
            >
              {initialTanks.map((tank) => <option key={tank.id} value={tank.id}>{tank.name} ({tank.fuelType})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="planned-liters" className="mb-1.5 block text-xs font-medium text-zinc-300">Planned volume change (L)</label>
            <input
              id="planned-liters"
              type="number"
              step="0.01"
              value={plannedLiters}
              onChange={(event) => setPlannedLiters(event.target.value)}
              placeholder="Positive delivery, negative withdrawal"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-center">
            <div>
              <p className="text-[11px] text-zinc-500">Projected volume</p>
              <p className="mt-1 font-mono text-sm font-semibold text-white">{projectedLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Fill level</p>
              <p className="mt-1 font-mono text-sm font-semibold text-cyan-300">{projectedPercentage.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">{projectedUllage >= 0 ? "Remaining capacity" : "Over capacity"}</p>
              <p className={`mt-1 font-mono text-sm font-semibold ${projectedUllage >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {Math.abs(projectedUllage).toLocaleString(undefined, { maximumFractionDigits: 2 })} L
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Individual Tank Cards */}
      <div className="space-y-4">
        {initialTanks.map((tank) => {
          const pct = ((tank.currentLiters / tank.capacityLiters) * 100).toFixed(1);
          const ullage = tank.capacityLiters - tank.currentLiters;
          const numPct = parseFloat(pct);

          return (
            <TankStatusCard
              key={tank.id}
              tank={tank}
              percentage={pct}
              ullage={ullage}
              numericPercentage={numPct}
            />
          );
        })}
      </div>
    </div>
  );
}

