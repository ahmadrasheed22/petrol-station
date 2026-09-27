"use client";

import { useState, useEffect, useId, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";
import { startShift, endShift, saveShiftProgress } from "@/lib/services/offline-service";
import { createClient } from "@/lib/supabase/client";
import ShiftDutyActiveForm from "@/components/ShiftDutyActiveForm";
import RecentDutiesLog from "@/components/RecentDutiesLog";

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

  useEffect(() => {
    if (!activeShift?.id) return;

    setClosingMeterStr(
      activeShift.closing_meter !== undefined && activeShift.closing_meter !== null
        ? String(activeShift.closing_meter)
        : ""
    );
    setTestingLitersStr(
      activeShift.testing_liters !== undefined && activeShift.testing_liters !== null
        ? String(activeShift.testing_liters)
        : "0"
    );
    setActualCashStr(
      activeShift.actual_cash !== undefined && activeShift.actual_cash !== null
        ? String(activeShift.actual_cash)
        : ""
    );
  }, [activeShift?.id]);

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
        text: `Duty ended and queued for upload. Sold: ${calculations.totalLitersSold.toFixed(2)}L | ${reconciliationText}`,
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

  const handleSaveProgress = async () => {
    if (!activeShift?.id) return;
    setActionMessage(null);

    const hasClosingInput = closingMeterStr.trim().length > 0;
    const hasTestingInput = testingLitersStr.trim().length > 0;
    const hasCashInput = actualCashStr.trim().length > 0;

    if (hasClosingInput && (!calculations.isClosingValid || closingMeter < activeOpeningMeter)) {
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
      await saveShiftProgress(activeShift.id, {
        ...(hasClosingInput && {
          closing_meter: closingMeter,
          total_liters: calculations.totalLitersSold,
          expected_cash: calculations.expectedCash,
          shortage_amount: hasCashInput ? calculations.shortageOrExcess : activeShift.shortage_amount,
        }),
        ...(hasTestingInput && {
          testing_liters: testingLiters,
        }),
        ...(hasCashInput && {
          actual_cash: actualCash,
          shortage_amount: calculations.shortageOrExcess,
        }),
      });

      setActionMessage({
        type: "success",
        text: "Progress saved. Duty remains active until you choose End Duty & Upload.",
      });
    } catch (err) {
      console.error("Failed to save duty progress in Dexie:", err);
      setActionMessage({ type: "error", text: "Failed to save progress to local database." });
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
                    {p.name}
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
          <ShiftDutyActiveForm
            activeShift={activeShift}
            workerName={workerName}
            activeOpeningMeter={activeOpeningMeter}
            activePricePerLiter={activePricePerLiter}
            closingMeter={closingMeter}
            testingLiters={testingLiters}
            closingMeterStr={closingMeterStr}
            testingLitersStr={testingLitersStr}
            actualCashStr={actualCashStr}
            calculations={calculations}
            isProcessing={isProcessing}
            onClosingMeterChange={setClosingMeterStr}
            onTestingLitersChange={setTestingLitersStr}
            onActualCashChange={setActualCashStr}
            onSaveProgress={handleSaveProgress}
            onEndDuty={handleEndDuty}
          />
        )}
      </div>

      {/* Previous Completed Duties Log */}
      {recentDuties && recentDuties.length > 0 && (
        <RecentDutiesLog duties={recentDuties} />
      )}
    </div>
  );
}
