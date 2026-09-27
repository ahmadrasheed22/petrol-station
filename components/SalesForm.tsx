"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";
import { addPendingSale } from "@/lib/services/offline-service";
import { createClient } from "@/lib/supabase/client";
import SalesFields, { type SalesProduct } from "@/components/SalesFields";

type Product = SalesProduct;

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
    const selected = products.find((product) => product.id === newProductId);
    if (selected && selected.current_sp) {
      setPricePerLiterStr(selected.current_sp.toString());
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    const selectedProduct = products.find((product) => product.id === productId);
    const productName = selectedProduct ? selectedProduct.name : "Product";

    setIsSubmitting(true);
    try {
      await addPendingSale({
        shift_id: activeShift?.shift_id,
        product_id: productId,
        total_liters: liters,
        applied_sp: pricePerLiter,
      });

      setSuccessMsg(`Sale of ${liters}L (${productName}) saved to Dexie successfully!`);
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
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Fuel Sale</h2>
              <p className="text-xs text-zinc-400">Record sale transaction directly to Dexie</p>
            </div>
          </div>

          {!activeShift && (
            <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              No Active Shift
            </span>
          )}
        </div>

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 text-sm font-bold ml-2 cursor-pointer">
              &times;
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 text-sm font-bold ml-2 cursor-pointer">
              &times;
            </button>
          </div>
        )}

        <SalesFields
          products={products}
          productId={productId}
          litersStr={litersStr}
          pricePerLiterStr={pricePerLiterStr}
          isLoadingProducts={isLoadingProducts}
          totalAmount={totalAmount}
          onSubmit={handleSubmit}
          onProductChange={handleProductChange}
          onLitersChange={setLitersStr}
          onPricePerLiterChange={setPricePerLiterStr}
        />
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