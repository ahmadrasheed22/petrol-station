"use client";

import { useId, type FormEventHandler } from "react";
import type { ShiftRecord } from "@/lib/offline-db";

interface ShiftCalculations {
  totalLitersSold: number;
  expectedCash: number;
  shortageOrExcess: number;
  isClosingValid: boolean;
}

interface ShiftDutyActiveFormProps {
  activeShift: ShiftRecord;
  workerName: string;
  activeOpeningMeter: number;
  activePricePerLiter: number;
  closingMeter: number;
  testingLiters: number;
  closingMeterStr: string;
  testingLitersStr: string;
  actualCashStr: string;
  calculations: ShiftCalculations;
  isProcessing: boolean;
  onClosingMeterChange: (value: string) => void;
  onTestingLitersChange: (value: string) => void;
  onActualCashChange: (value: string) => void;
  onSaveProgress: () => void;
  onEndDuty: FormEventHandler<HTMLFormElement>;
}

export default function ShiftDutyActiveForm({
  activeShift,
  workerName,
  activeOpeningMeter,
  activePricePerLiter,
  closingMeter,
  testingLiters,
  closingMeterStr,
  testingLitersStr,
  actualCashStr,
  calculations,
  isProcessing,
  onClosingMeterChange,
  onTestingLitersChange,
  onActualCashChange,
  onSaveProgress,
  onEndDuty,
}: ShiftDutyActiveFormProps) {
  const closingMeterId = useId();
  const testingLitersId = useId();
  const actualCashId = useId();

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
        <div className="flex items-center justify-between mb-3 border-b border-amber-500/10 pb-2">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Active Duty Summary
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Started: {new Date(activeShift.start_time).toLocaleTimeString("en-US")}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-zinc-500 block">Product:</span>
            <span className="font-bold text-white text-sm">
              {activeShift.product_name || "Fuel"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Rate / Liter:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              Rs. {activeShift.price_per_liter?.toLocaleString() ?? 0}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Opening Meter:</span>
            <span className="font-mono font-bold text-zinc-200 text-sm">
              {activeShift.opening_meter?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Duty Worker:</span>
            <span className="font-semibold text-zinc-200 text-sm">
              {activeShift.worker_name || workerName}
            </span>
          </div>
        </div>
      </div>

      <form id="end-duty-form" onSubmit={onEndDuty} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor={closingMeterId} className="block text-xs font-medium text-zinc-400 mb-1.5">
              Closing Meter Reading
            </label>
            <input
              id={closingMeterId}
              type="number"
              step="0.01"
              min={activeOpeningMeter}
              value={closingMeterStr}
              onChange={(event) => onClosingMeterChange(event.target.value)}
              placeholder={`>= ${activeOpeningMeter}`}
              className={`w-full rounded-xl border bg-zinc-950 px-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-colors ${
                !calculations.isClosingValid
                  ? "border-rose-500/60 focus:ring-rose-500/20"
                  : "border-zinc-800 focus:border-amber-500/50 focus:ring-amber-500/20"
              }`}
              required
            />
            {!calculations.isClosingValid && (
              <p className="text-[11px] text-rose-400 mt-1">
                Must be &ge; opening ({activeOpeningMeter})
              </p>
            )}
          </div>

          <div>
            <label htmlFor={testingLitersId} className="block text-xs font-medium text-zinc-400 mb-1.5">
              Testing Liters (Non-sale)
            </label>
            <input
              id={testingLitersId}
              type="number"
              step="0.01"
              min="0"
              value={testingLitersStr}
              onChange={(event) => onTestingLitersChange(event.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
            />
            <p className="text-[11px] text-zinc-500 mt-1">Deducted from gross meter</p>
          </div>

          <div>
            <label htmlFor={actualCashId} className="block text-xs font-medium text-zinc-400 mb-1.5">
              Actual Cash in Drawer
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-mono">Rs.</span>
              <input
                id={actualCashId}
                type="number"
                step="0.01"
                min="0"
                value={actualCashStr}
                onChange={(event) => onActualCashChange(event.target.value)}
                placeholder="e.g. 54000"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
                required
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Physical cash collected</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2">
            <span className="font-semibold text-zinc-300">Live Shift Calculations Preview</span>
            <span className="text-[11px] text-zinc-500 font-mono">Auto-computed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-3">
              <div className="text-[11px] text-zinc-400">Total Liters Sold</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {calculations.totalLitersSold.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs font-normal text-zinc-400">L</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                ({closingMeter || 0} - {activeOpeningMeter}) - {testingLiters || 0}
              </div>
            </div>

            <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-3">
              <div className="text-[11px] text-zinc-400">Expected Cash</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                Rs. {calculations.expectedCash.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {calculations.totalLitersSold.toFixed(2)}L &times; Rs. {activePricePerLiter}
              </div>
            </div>

            <div
              className={`rounded-lg border p-3 ${
                !actualCashStr.trim()
                  ? "bg-zinc-900/60 border-zinc-800/80"
                  : calculations.shortageOrExcess === 0
                  ? "bg-emerald-950/20 border-emerald-500/30"
                  : calculations.shortageOrExcess < 0
                  ? "bg-rose-950/20 border-rose-500/30"
                  : "bg-indigo-950/20 border-indigo-500/30"
              }`}
            >
              <div className="text-[11px] text-zinc-400">Cash Reconciliation</div>
              <div className="text-xl font-bold font-mono mt-1">
                {!actualCashStr.trim() ? (
                  <span className="text-zinc-500 text-sm">Enter drawer cash</span>
                ) : calculations.shortageOrExcess === 0 ? (
                  <span className="text-emerald-400">Balanced (Rs. 0)</span>
                ) : calculations.shortageOrExcess < 0 ? (
                  <span className="text-rose-400">
                    -Rs. {Math.abs(calculations.shortageOrExcess).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : (
                  <span className="text-indigo-400">
                    +Rs. {calculations.shortageOrExcess.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {actualCashStr.trim()
                  ? calculations.shortageOrExcess < 0
                    ? "Shortage (drawer less than meter)"
                    : calculations.shortageOrExcess > 0
                    ? "Excess (drawer more than meter)"
                    : "Drawer matches expected cash"
                  : "Actual Cash vs Expected Cash"}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onSaveProgress}
            disabled={isProcessing}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-100 font-semibold px-4 py-3 text-sm shadow-lg shadow-zinc-950/40 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-500/30 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>Saving Progress...</span>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16v4m-2-2h4M4 4h16v8H4z" />
                </svg>
                <span>Save Progress</span>
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isProcessing || !calculations.isClosingValid}
            className="w-full rounded-xl border border-rose-500/40 bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-3 text-sm shadow-lg shadow-rose-950/50 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>Ending Duty & Uploading...</span>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>End Duty & Upload</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
