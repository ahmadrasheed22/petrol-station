"use client";

import { useState, useEffect, useId, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ShiftRecord } from "@/lib/offline-db";
import { startShift, endShift } from "@/lib/services/offline-service";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  current_sp?: number;
  current_cp?: number;
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Petrol", current_sp: 270, current_cp: 255 },
  { id: "22222222-2222-4222-8222-222222222222", name: "Diesel", current_sp: 280, current_cp: 265 },
  { id: "33333333-3333-4333-8333-333333333333", name: "Hi-Octane", current_sp: 300, current_cp: 285 },
];

interface ShiftDutyManagerProps {
  userId: string;
  workerName: string;
  userRole?: string;
}

export default function ShiftDutyManager({
  userId,
  workerName,
}: ShiftDutyManagerProps) {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Start Duty Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(DEFAULT_PRODUCTS[0].id);
  const [startPriceStr, setStartPriceStr] = useState<string>(DEFAULT_PRODUCTS[0].current_sp?.toString() || "270");
  const [openingMeterStr, setOpeningMeterStr] = useState<string>("");

  // End Duty Form State
  const [closingMeterStr, setClosingMeterStr] = useState<string>("");
  const [testingLitersStr, setTestingLitersStr] = useState<string>("0");
  const [actualCashStr, setActualCashStr] = useState<string>("");

  // Processing & Feedback State
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Accessible IDs
  const productSelectId = useId();
  const startPriceId = useId();
  const openingMeterId = useId();
  const closingMeterId = useId();
  const testingLitersId = useId();
  const actualCashId = useId();

  // Reactive Dexie queries
  const activeShift = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return null;
      return await db.shifts.where("status").equals("active").first();
    },
    [],
    null
  );

  const recentDuties = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.shifts
        .where("status")
        .equals("ended")
        .reverse()
        .sortBy("created_at")
        .then((items) => items.slice(0, 3));
    },
    [],
    []
  );

  // Hydration & initial products fetch
  useEffect(() => {
    setMounted(true);

    async function loadProducts() {
      setIsLoadingProducts(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("products")
          .select("id, name, current_sp, current_cp")
          .order("name");

        if (!error && data && data.length > 0) {
          setProducts(data);
          setSelectedProductId(data[0].id);
          if (data[0].current_sp) {
            setStartPriceStr(data[0].current_sp.toString());
          }
        }
      } catch (err) {
        console.warn("Could not load products, fallback to defaults:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    loadProducts();
  }, []);

  // When changing product in Start Duty, update default price
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find((item) => item.id === prodId);
    if (p && p.current_sp) {
      setStartPriceStr(p.current_sp.toString());
    }
  };

  // Live Calculations for End Duty
  const activeOpeningMeter = activeShift?.opening_meter ?? 0;
  const activePricePerLiter = activeShift?.price_per_liter ?? 0;

  const closingMeter = parseFloat(closingMeterStr) || 0;
  const testingLiters = parseFloat(testingLitersStr) || 0;
  const actualCash = parseFloat(actualCashStr) || 0;

  const calculations = useMemo(() => {
    if (!activeShift) {
      return {
        grossMeterDelta: 0,
        totalLitersSold: 0,
        expectedCash: 0,
        shortageOrExcess: 0,
        isClosingValid: true,
      };
    }

    const hasClosingInput = closingMeterStr.trim().length > 0;
    const grossMeterDelta = hasClosingInput ? closingMeter - activeOpeningMeter : 0;
    const isClosingValid = !hasClosingInput || closingMeter >= activeOpeningMeter;

    // Formula: Total Liters Sold = (closing_meter - opening_meter) - testing_liters
    const totalLitersSold = hasClosingInput
      ? Math.max(0, grossMeterDelta - testingLiters)
      : 0;

    // Formula: Expected Cash = Total Liters Sold * price_per_liter
    const expectedCash = totalLitersSold * activePricePerLiter;

    // Formula: Shortage or Excess = actual_cash - expected_cash
    const hasCashInput = actualCashStr.trim().length > 0;
    const shortageOrExcess = hasCashInput ? actualCash - expectedCash : 0;

    return {
      grossMeterDelta,
      totalLitersSold,
      expectedCash,
      shortageOrExcess,
      isClosingValid,
    };
  }, [
    activeShift,
    closingMeterStr,
    closingMeter,
    activeOpeningMeter,
    testingLiters,
    activePricePerLiter,
    actualCashStr,
    actualCash,
  ]);

  // Handle Start Duty Submission
  const handleStartDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    const price = parseFloat(startPriceStr);
    const opening = parseFloat(openingMeterStr);

    if (isNaN(price) || price <= 0) {
      setActionMessage({ type: "error", text: "Please enter a valid price per liter (> 0)." });
      return;
    }

    if (isNaN(opening) || opening < 0) {
      setActionMessage({ type: "error", text: "Please enter a valid opening meter reading (>= 0)." });
      return;
    }

    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const productName = selectedProduct ? selectedProduct.name : "Fuel";

    setIsProcessing(true);
    try {
      const newShift = await startShift(userId, {
        worker_name: workerName,
        product_id: selectedProductId,
        product_name: productName,
        price_per_liter: price,
        opening_meter: opening,
      });

      setActionMessage({
        type: "success",
        text: `Duty started for ${productName} (Opening: ${opening.toLocaleString()} | Rate: Rs. ${price}/L)`,
      });

      // Reset start inputs
      setOpeningMeterStr("");
    } catch (err) {
      console.error("Failed to start duty in Dexie:", err);
      setActionMessage({ type: "error", text: "Failed to save duty start in local database." });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle End Duty Submission
  const handleEndDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift?.id) return;
    setActionMessage(null);

    if (!calculations.isClosingValid || closingMeter < activeOpeningMeter) {
      setActionMessage({
        type: "error",
        text: `Closing meter (${closingMeter}) cannot be less than opening meter (${activeOpeningMeter}).`,
      });
      return;
    }

    if (testingLiters < 0) {
      setActionMessage({ type: "error", text: "Testing liters cannot be negative." });
      return;
    }

    if (actualCash < 0) {
      setActionMessage({ type: "error", text: "Actual drawer cash cannot be negative." });
      return;
    }

    setIsProcessing(true);
    try {
      await endShift(activeShift.id, {
        closing_meter: closingMeter,
        testing_liters: testingLiters,
        total_liters: calculations.totalLitersSold,
        expected_cash: calculations.expectedCash,
        actual_cash: actualCash,
        shortage_amount: calculations.shortageOrExcess,
      });

      const summaryDiff = calculations.shortageOrExcess;
      const reconciliationText =
        summaryDiff === 0
          ? "Exact Balanced (Rs. 0)"
          : summaryDiff < 0
          ? `Shortage of -Rs. ${Math.abs(summaryDiff).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          : `Excess of +Rs. ${summaryDiff.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

      setActionMessage({
        type: "success",
        text: `Duty completed & saved to Dexie! Sold: ${calculations.totalLitersSold.toFixed(2)}L | ${reconciliationText}`,
      });

      // Reset end duty inputs
      setClosingMeterStr("");
      setTestingLitersStr("0");
      setActualCashStr("");
    } catch (err) {
      console.error("Failed to end duty in Dexie:", err);
      setActionMessage({ type: "error", text: "Failed to save completed duty to local database." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl animate-pulse space-y-4">
        <div className="h-6 w-48 bg-zinc-800 rounded" />
        <div className="h-32 bg-zinc-800/40 rounded-xl" />
        <div className="h-10 bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-6">
      <div>
        {/* Component Header with Duty Status */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                activeShift
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {activeShift ? "Duty In Progress" : "Start New Duty"}
              </h2>
              <p className="text-xs text-zinc-400">
                {activeShift
                  ? "Input closing meter readings & reconcile cash drawer"
                  : "Select nozzle product & input opening meter reading"}
              </p>
            </div>
          </div>

          <div>
            {activeShift ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Duty Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                Duty Idle
              </span>
            )}
          </div>
        </div>

        {/* Feedback Message Banner */}
        {actionMessage && (
          <div
            className={`mb-5 rounded-xl border p-3 text-xs flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-sm font-bold ml-2 cursor-pointer hover:opacity-75"
            >
              &times;
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASE 1: NO ACTIVE SHIFT -> START DUTY COMPONENT           */}
        {/* ========================================================= */}
        {!activeShift && (
          <form onSubmit={handleStartDuty} className="space-y-4">
            {/* Product Selection */}
            <div>
              <label
                htmlFor={productSelectId}
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Nozzle Fuel Product
              </label>
              <select
                id={productSelectId}
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                disabled={isLoadingProducts}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Default: Rs. {p.current_sp ?? 0}/L)
                  </option>
                ))}
              </select>
            </div>

            {/* Price Per Liter & Opening Meter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={startPriceId}
                  className="block text-xs font-medium text-zinc-400 mb-1.5"
                >
                  Today&apos;s Price (Rs./Liter)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-mono">
                    Rs.
                  </span>
                  <input
                    id={startPriceId}
                    type="number"
                    step="0.01"
                    min="1"
                    value={startPriceStr}
                    onChange={(e) => setStartPriceStr(e.target.value)}
                    placeholder="270.00"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={openingMeterId}
                  className="block text-xs font-medium text-zinc-400 mb-1.5"
                >
                  Opening Meter Reading
                </label>
                <div className="relative">
                  <input
                    id={openingMeterId}
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingMeterStr}
                    onChange={(e) => setOpeningMeterStr(e.target.value)}
                    placeholder="e.g. 154230.50"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Opening Duty...</span>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Start Duty (Open Shift)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* CASE 2: ACTIVE SHIFT -> END DUTY COMPONENT WITH LIVE CALC */}
        {/* ========================================================= */}
        {activeShift && (
          <div className="space-y-5">
            {/* Active Duty Snapshot Badge */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
              <div className="flex items-center justify-between mb-3 border-b border-amber-500/10 pb-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Active Duty Summary
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  Started: {new Date(activeShift.start_time).toLocaleTimeString()}
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

            {/* End Duty Input Form */}
            <form id="end-duty-form" onSubmit={handleEndDuty} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Closing Meter */}
                <div>
                  <label
                    htmlFor={closingMeterId}
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    Closing Meter Reading
                  </label>
                  <input
                    id={closingMeterId}
                    type="number"
                    step="0.01"
                    min={activeOpeningMeter}
                    value={closingMeterStr}
                    onChange={(e) => setClosingMeterStr(e.target.value)}
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

                {/* Testing Liters */}
                <div>
                  <label
                    htmlFor={testingLitersId}
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    Testing Liters (Non-sale)
                  </label>
                  <input
                    id={testingLitersId}
                    type="number"
                    step="0.01"
                    min="0"
                    value={testingLitersStr}
                    onChange={(e) => setTestingLitersStr(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Deducted from gross meter
                  </p>
                </div>

                {/* Actual Cash Drawer */}
                <div>
                  <label
                    htmlFor={actualCashId}
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    Actual Cash in Drawer
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-mono">
                      Rs.
                    </span>
                    <input
                      id={actualCashId}
                      type="number"
                      step="0.01"
                      min="0"
                      value={actualCashStr}
                      onChange={(e) => setActualCashStr(e.target.value)}
                      placeholder="e.g. 54000"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Physical cash collected
                  </p>
                </div>
              </div>

              {/* LIVE RECONCILIATION & AUTO-CALCULATION CARD */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2">
                  <span className="font-semibold text-zinc-300">
                    Live Shift Calculations Preview
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Auto-computed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Calculation 1: Total Liters Sold */}
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

                  {/* Calculation 2: Expected Cash */}
                  <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-3">
                    <div className="text-[11px] text-zinc-400">Expected Cash</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      Rs.{" "}
                      {calculations.expectedCash.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {calculations.totalLitersSold.toFixed(2)}L &times; Rs. {activePricePerLiter}
                    </div>
                  </div>

                  {/* Calculation 3: Shortage or Excess */}
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
                    <div className="text-[11px] text-zinc-400">
                      Cash Reconciliation
                    </div>
                    <div className="text-xl font-bold font-mono mt-1">
                      {!actualCashStr.trim() ? (
                        <span className="text-zinc-500 text-sm">Enter drawer cash</span>
                      ) : calculations.shortageOrExcess === 0 ? (
                        <span className="text-emerald-400">Balanced (Rs. 0)</span>
                      ) : calculations.shortageOrExcess < 0 ? (
                        <span className="text-rose-400">
                          -Rs.{" "}
                          {Math.abs(calculations.shortageOrExcess).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-indigo-400">
                          +Rs.{" "}
                          {calculations.shortageOrExcess.toLocaleString(undefined, {
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

              {/* End Duty Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing || !calculations.isClosingValid}
                  className="w-full rounded-xl border border-rose-500/40 bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-3 text-sm shadow-lg shadow-rose-950/50 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <span>Saving Shift Duty to Offline Dexie...</span>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Complete & End Duty (Save Shift)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Previous Completed Duties Log */}
      {recentDuties && recentDuties.length > 0 && (
        <div className="border-t border-zinc-800/80 pt-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2.5">
            <span className="font-semibold text-zinc-300">Recent Completed Duties</span>
            <span className="text-[11px] text-zinc-500">Local Dexie Log</span>
          </div>
          <div className="space-y-2">
            {recentDuties.map((duty: ShiftRecord) => {
              const diff = duty.shortage_amount ?? 0;
              return (
                <div
                  key={duty.shift_id}
                  className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {duty.product_name || "Fuel"}
                      </span>
                      <span className="text-zinc-500 font-mono text-[11px]">
                        Meters: {duty.opening_meter?.toLocaleString() ?? 0} &rarr; {duty.closing_meter?.toLocaleString() ?? 0}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Sold: <span className="font-mono text-zinc-200">{duty.total_liters?.toFixed(2) ?? "0.00"}L</span> | Rate: Rs. {duty.price_per_liter ?? 0}/L
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:text-right">
                    <div>
                      <div className="font-mono text-zinc-200 font-medium">
                        Expected: Rs. {duty.expected_cash?.toLocaleString() ?? 0}
                      </div>
                      <div className="font-mono text-zinc-400 text-[11px]">
                        Drawer: Rs. {duty.actual_cash?.toLocaleString() ?? 0}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        diff === 0
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : diff < 0
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}
                    >
                      {diff === 0
                        ? "Balanced"
                        : diff < 0
                        ? `-Rs. ${Math.abs(diff).toLocaleString()}`
                        : `+Rs. ${diff.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
