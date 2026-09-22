"use client";

import { useState, useEffect, useId } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";
import { addPendingSale } from "@/lib/services/offline-service";
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

export default function SalesForm() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [litersStr, setLitersStr] = useState("");
  const [pricePerLiterStr, setPricePerLiterStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const productInputId = useId();
  const litersInputId = useId();
  const priceInputId = useId();
  const totalAmountInputId = useId();

  // Safeguard against SSR hydration mismatch & load products from Supabase
  useEffect(() => {
    setMounted(true);

    async function fetchProducts() {
      setIsLoadingProducts(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("products")
          .select("id, name, current_sp, current_cp")
          .order("name");

        if (error) {
          console.error("Error fetching products from Supabase:", error.message);
        }

        if (data && data.length > 0) {
          setProducts(data);
          setProductId(data[0].id);
          if (data[0].current_sp) {
            setPricePerLiterStr(data[0].current_sp.toString());
          }
        } else {
          // If products table is empty in Supabase, auto-seed default products
          const { data: seededData, error: seedError } = await supabase
            .from("products")
            .upsert(DEFAULT_PRODUCTS, { onConflict: "id" })
            .select("id, name, current_sp, current_cp");

          const effectiveProducts = (!seedError && seededData && seededData.length > 0)
            ? seededData
            : DEFAULT_PRODUCTS;

          setProducts(effectiveProducts);
          setProductId(effectiveProducts[0].id);
          if (effectiveProducts[0].current_sp) {
            setPricePerLiterStr(effectiveProducts[0].current_sp.toString());
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load products:", err);
        setProducts(DEFAULT_PRODUCTS);
        setProductId(DEFAULT_PRODUCTS[0].id);
        setPricePerLiterStr(DEFAULT_PRODUCTS[0].current_sp!.toString());
      } finally {
        setIsLoadingProducts(false);
      }
    }

    fetchProducts();
  }, []);

  // Live query for current active shift
  const activeShift = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return null;
      return await db.shifts.where("status").equals("active").first();
    },
    [],
    null
  );

  const liters = parseFloat(litersStr) || 0;
  const pricePerLiter = parseFloat(pricePerLiterStr) || 0;
  const totalAmount = liters * pricePerLiter;

  const handleProductChange = (newProductId: string) => {
    setProductId(newProductId);
    const selected = products.find((p) => p.id === newProductId);
    if (selected && selected.current_sp) {
      setPricePerLiterStr(selected.current_sp.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!productId) {
      setErrorMsg("Please select a valid product.");
      return;
    }
    if (liters <= 0) {
      setErrorMsg("Please enter a valid number of liters (> 0).");
      return;
    }
    if (pricePerLiter <= 0) {
      setErrorMsg("Please enter a valid price per liter (> 0).");
      return;
    }

    const selectedProduct = products.find((p) => p.id === productId);
    const productName = selectedProduct ? selectedProduct.name : "Product";

    setIsSubmitting(true);
    try {
      await addPendingSale({
        shift_id: activeShift?.shift_id,
        product_id: productId, // Sends actual UUID to Dexie & Supabase
        total_liters: liters,
        applied_sp: pricePerLiter,
      });

      setSuccessMsg(
        `Sale of ${liters}L (${productName}) saved to Dexie successfully!`
      );
      setLitersStr("");
    } catch (err: unknown) {
      console.error("Error saving sale to Dexie:", err);
      setErrorMsg("Failed to save sale record locally.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl animate-pulse">
        <div className="h-6 w-36 bg-zinc-800 rounded mb-4" />
        <div className="space-y-4">
          <div className="h-10 w-full bg-zinc-800/50 rounded-xl" />
          <div className="h-10 w-full bg-zinc-800/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-6">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
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
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Fuel Sale</h2>
              <p className="text-xs text-zinc-400">
                Record sale transaction directly to Dexie
              </p>
            </div>
          </div>

          {!activeShift && (
            <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              No Active Shift
            </span>
          )}
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center justify-between">
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-400 hover:text-emerald-200 text-sm font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-rose-200 text-sm font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Form Inputs */}
        <form id="sales-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor={productInputId}
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Product
            </label>
            <select
              id={productInputId}
              name="product_id"
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={isLoadingProducts || products.length === 0}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {isLoadingProducts ? (
                <option value="">Loading products...</option>
              ) : products.length === 0 ? (
                <option value="">No products found in database</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={litersInputId}
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Liters
              </label>
              <input
                id={litersInputId}
                name="liters"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={litersStr}
                onChange={(e) => setLitersStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                required
              />
            </div>

            <div>
              <label
                htmlFor={priceInputId}
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Price per Liter
              </label>
              <input
                id={priceInputId}
                name="price_per_liter"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={pricePerLiterStr}
                onChange={(e) => setPricePerLiterStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={totalAmountInputId}
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Total Amount (Calculated)
            </label>
            <input
              id={totalAmountInputId}
              name="total_amount"
              type="text"
              readOnly
              value={
                totalAmount > 0
                  ? `Rs. ${totalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "Rs. 0.00"
              }
              className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/80 px-3.5 py-2.5 text-sm font-semibold text-emerald-400 cursor-not-allowed select-none"
            />
          </div>
        </form>
      </div>

      <div>
        <button
          type="submit"
          form="sales-form"
          disabled={isSubmitting || isLoadingProducts || products.length === 0}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Saving to Dexie..." : "Log Sale Record (Offline)"}
        </button>
      </div>
    </div>
  );
}
