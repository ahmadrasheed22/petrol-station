"use client";

import { useState, useEffect, useId } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";
import { addPendingInventory } from "@/lib/services/offline-service";
import { createClient } from "@/lib/supabase/client";
import InventoryArrivalHistory from "@/components/InventoryArrivalHistory";

interface Product {
  id: string;
  name: string;
  current_sp?: number;
  current_cp?: number;
}


export default function InventoryArrivalForm() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [billedLitersStr, setBilledLitersStr] = useState<string>("");
  const [actualReceivedLitersStr, setActualReceivedLitersStr] = useState<string>("");
  const [costPerLiterStr, setCostPerLiterStr] = useState<string>("");
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const productSelectId = useId();
  const billedInputId = useId();
  const actualInputId = useId();
  const costInputId = useId();

  // Reactive query of offline inventory arrivals from Dexie
  const recentArrivals = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.pendingInventory.reverse().limit(10).toArray();
    },
    [],
    []
  );

  // Fetch products from Supabase or fallback
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
          // Bulletproof dedup: Map keyed by trimmed name guarantees absolute uniqueness
          const unique = Array.from(
            new Map(data.map((p) => [p.name.trim(), p])).values()
          );
          setProducts(unique);
          setSelectedProductId(unique[0].id);
          // Do NOT pre-fill cost — worker must enter it manually
        }
        // If no products found in DB, leave dropdown empty — do not show fake fallback data.
      } catch (err) {
        console.warn("Could not fetch remote products:", err);
        // Leave products empty on error — graceful degradation without fake data.
      } finally {
        setIsLoadingProducts(false);
      }
    }

    loadProducts();
  }, []);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    // Do NOT auto-populate cost — worker must enter it manually each time
  };

  const billedLiters = parseFloat(billedLitersStr) || 0;
  const actualReceivedLiters = parseFloat(actualReceivedLitersStr) || 0;
  const costPerLiter = parseFloat(costPerLiterStr) || 0;

  const totalCost = billedLiters * costPerLiter;
  const varianceLiters = actualReceivedLiters > 0 && billedLiters > 0 ? actualReceivedLiters - billedLiters : 0;
  const variancePct =
    billedLiters > 0 && actualReceivedLiters > 0
      ? ((varianceLiters / billedLiters) * 100).toFixed(2)
      : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedProductId) {
      setErrorMsg("Please select a fuel product.");
      return;
    }

    if (isNaN(billedLiters) || billedLiters <= 0) {
      setErrorMsg("Please enter a valid billed volume greater than 0 liters.");
      return;
    }

    if (isNaN(actualReceivedLiters) || actualReceivedLiters <= 0) {
      setErrorMsg("Please enter a valid actual received volume greater than 0 liters.");
      return;
    }

    if (isNaN(costPerLiter) || costPerLiter <= 0) {
      setErrorMsg("Please enter a valid cost per liter greater than 0.");
      return;
    }

    setIsSubmitting(true);

    try {
      const insertedId = await addPendingInventory({
        product_id: selectedProductId,
        billed_liters: billedLiters,
        actual_received_liters: actualReceivedLiters,
        cost_per_liter: costPerLiter,
      });

      const selectedProduct = products.find((p) => p.id === selectedProductId);
      const productName = selectedProduct ? selectedProduct.name : "Fuel";

      setSuccessMsg(
        `Tanker arrival #${insertedId} for ${actualReceivedLiters.toLocaleString()}L ${productName} saved locally to Dexie (Offline-First).`
      );

      // Reset form
      setBilledLitersStr("");
      setActualReceivedLitersStr("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record fuel tanker arrival.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductName = (prodId: string) => {
    const p = products.find((prod) => prod.id === prodId);
    return p ? p.name : prodId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Log Fuel Tanker Arrival
              </h2>
              <p className="text-xs text-zinc-400">
                Record incoming tanker delivery into offline inventory
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/70 border border-zinc-700/50 px-3 py-1 text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>IndexedDB (Offline)</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2">
            <svg className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-start gap-2">
            <svg className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fuel Product Selector */}
          <div>
            <label htmlFor={productSelectId} className="block text-xs font-medium text-zinc-300 mb-1.5">
              Select Product
            </label>
            <select
              id={productSelectId}
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={isSubmitting || isLoadingProducts}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer"
            >
              {products.length === 0 && !isLoadingProducts ? (
                <option value="">No products found in database</option>
              ) : isLoadingProducts ? (
                <option value="">Loading products...</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Liters Grid: Billed vs Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={billedInputId} className="block text-xs font-medium text-zinc-300 mb-1.5">
                Billed Liters (Invoice)
              </label>
              <div className="relative">
                <input
                  id={billedInputId}
                  type="number"
                  step="any"
                  placeholder="e.g. 10000"
                  value={billedLitersStr}
                  onChange={(e) => setBilledLitersStr(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-mono">L</span>
              </div>
            </div>

            <div>
              <label htmlFor={actualInputId} className="block text-xs font-medium text-zinc-300 mb-1.5">
                Actual Received Liters (Dip / Meter)
              </label>
              <div className="relative">
                <input
                  id={actualInputId}
                  type="number"
                  step="any"
                  placeholder="e.g. 9950"
                  value={actualReceivedLitersStr}
                  onChange={(e) => setActualReceivedLitersStr(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-mono">L</span>
              </div>
            </div>
          </div>

          {/* Cost Per Liter */}
          <div>
            <label htmlFor={costInputId} className="block text-xs font-medium text-zinc-300 mb-1.5">
              Cost Per Liter (PKR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-mono">PKR</span>
              <input
                id={costInputId}
                type="number"
                step="any"
                placeholder="e.g. 255.00"
                value={costPerLiterStr}
                onChange={(e) => setCostPerLiterStr(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-12 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Live Calculation Preview Box */}
          {(billedLiters > 0 || actualReceivedLiters > 0) && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Total Invoice Value (Billed):</span>
                <span className="font-mono text-white font-semibold">
                  PKR {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Transit Variance (Shortage / Gain):</span>
                <span
                  className={`font-mono font-semibold ${
                    varianceLiters < 0
                      ? "text-rose-400"
                      : varianceLiters > 0
                      ? "text-emerald-400"
                      : "text-zinc-300"
                  }`}
                >
                  {varianceLiters > 0 ? "+" : ""}
                  {varianceLiters.toFixed(2)} L ({variancePct}%)
                </span>
              </div>
              {varianceLiters < 0 && (
                <div className="text-[11px] text-amber-400/90 pt-1 border-t border-zinc-800">
                  Note: Transit shortage of {Math.abs(varianceLiters).toFixed(1)}L will be logged for delivery audit.
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoadingProducts}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition-all shadow-lg shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin text-zinc-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving to Dexie...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Record Tanker Arrival (Offline-First)</span>
              </>
            )}
          </button>
        </form>
      </div>

      <InventoryArrivalHistory
        mounted={mounted}
        arrivals={recentArrivals}
        getProductName={getProductName}
      />
    </div>
  );
}
