"use client";

import { useState } from "react";

interface Tank {
  id: string;
  name: string;
  fuelType: string;
  capacityLiters: number;
  currentLiters: number;
  color: {
    bar: string;
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
  temperatureC: number;
  waterBottomMm: number;
}

const INITIAL_TANKS: Tank[] = [
  {
    id: "tank-1",
    name: "Tank 01 - Underground",
    fuelType: "Petrol (Super 92)",
    capacityLiters: 45000,
    currentLiters: 32400,
    color: {
      bar: "from-emerald-500 to-teal-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/20",
    },
    temperatureC: 28.4,
    waterBottomMm: 0,
  },
  {
    id: "tank-2",
    name: "Tank 02 - Underground",
    fuelType: "High Speed Diesel",
    capacityLiters: 50000,
    currentLiters: 38500,
    color: {
      bar: "from-amber-500 to-orange-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      glow: "shadow-amber-500/20",
    },
    temperatureC: 29.1,
    waterBottomMm: 2,
  },
  {
    id: "tank-3",
    name: "Tank 03 - Underground",
    fuelType: "Hi-Octane (RON 97)",
    capacityLiters: 25000,
    currentLiters: 14200,
    color: {
      bar: "from-indigo-500 to-purple-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      text: "text-indigo-400",
      glow: "shadow-indigo-500/20",
    },
    temperatureC: 27.8,
    waterBottomMm: 0,
  },
];

export default function TankStatus() {
  const [tanks] = useState<Tank[]>(INITIAL_TANKS);
  const [calculatorTankId, setCalculatorTankId] = useState(INITIAL_TANKS[0].id);
  const [plannedLiters, setPlannedLiters] = useState("");

  const calculatorTank = tanks.find((tank) => tank.id === calculatorTankId) ?? tanks[0];
  const plannedChange = Number.parseFloat(plannedLiters) || 0;
  const projectedLiters = calculatorTank.currentLiters + plannedChange;
  const projectedUllage = calculatorTank.capacityLiters - projectedLiters;
  const projectedPercentage = (projectedLiters / calculatorTank.capacityLiters) * 100;

  const totalCapacity = tanks.reduce((acc, t) => acc + t.capacityLiters, 0);
  const totalFuel = tanks.reduce((acc, t) => acc + t.currentLiters, 0);
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
                Automated dip gauge readings & current storage volume
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
              3 Underground Tanks
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
              {tanks.map((tank) => <option key={tank.id} value={tank.id}>{tank.name} ({tank.fuelType})</option>)}
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
        {tanks.map((tank) => {
          const pct = ((tank.currentLiters / tank.capacityLiters) * 100).toFixed(1);
          const ullage = tank.capacityLiters - tank.currentLiters;
          const numPct = parseFloat(pct);

          return (
            <div
              key={tank.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-xl hover:border-zinc-700/80 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {tank.name}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${tank.color.bg} ${tank.color.border} ${tank.color.text}`}
                    >
                      {tank.fuelType}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    Max Safe Capacity: {tank.capacityLiters.toLocaleString()} L
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-white">
                    {pct}%
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {tank.currentLiters.toLocaleString()} L
                  </div>
                </div>
              </div>

              {/* Progress Level Bar */}
              <div className="relative w-full h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tank.color.bar} transition-all duration-700 shadow-sm ${tank.color.glow}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Sensor & Capacity Breakdown */}
              <div className="mt-3.5 grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800/80 text-[11px]">
                <div>
                  <span className="text-zinc-500">Ullage (Can Take):</span>
                  <div className="font-mono font-medium text-cyan-400">
                    +{ullage.toLocaleString()} L
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500">Temp / Density:</span>
                  <div className="font-mono text-zinc-300">
                    {tank.temperatureC}°C
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500">Water Bottom:</span>
                  <div className="font-mono text-zinc-300">
                    {tank.waterBottomMm} mm (Clean)
                  </div>
                </div>
              </div>

              {/* Status Alert if low */}
              {numPct < 25 && (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                  <span>Warning: Fuel level below 25%. Schedule a tanker arrival immediately.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
