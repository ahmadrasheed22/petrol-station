"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";
import { addPendingLedgerTx } from "@/lib/services/offline-service";
import { createClient } from "@/lib/supabase/client";
import CreditSaleFields, { type CreditSaleProduct } from "@/components/CreditSaleFields";

type Product = CreditSaleProduct;

const DEFAULT_PRODUCTS: Product[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Petrol", current_sp: 270, current_cp: 255 },
  { id: "22222222-2222-4222-8222-222222222222", name: "Diesel", current_sp: 280, current_cp: 265 },
  { id: "33333333-3333-4333-8333-333333333333", name: "Hi-Octane", current_sp: 300, current_cp: 285 },
];

export default function CreditSaleForm({
  onSaleRecorded,
}: {
  onSaleRecorded?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [litersStr, setLitersStr] = useState<string>("");
  const [pricePerLiterStr, setPricePerLiterStr] = useState<string>("");
  const [manualAmountStr, setManualAmountStr] = useState<string>("");
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live query for active shift
  const activeShift = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return null;
      return await db.shifts.where("status").equals("active").first();
    },
    [],
    null
  );

  // Initialize products on mount
  useEffect(() => {
    setMounted(true);

    async function initData() {
      setIsLoadingProducts(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("products")
          .select("id, name, current_sp, current_cp")
          .order("name");

        if (!error && data && data.length > 0) {
          const uniqueProducts = Array.from(
            new Map(data.map((product) => [product.name.trim().toLowerCase(), product])).values()
          );
          setProducts(uniqueProducts);
          setSelectedProductId(uniqueProducts[0].id);
        } else {
          setProducts(DEFAULT_PRODUCTS);
          setSelectedProductId(DEFAULT_PRODUCTS[0].id);
        }
      } catch (err) {
        console.warn("Could not fetch remote products, using defaults:", err);
        setProducts(DEFAULT_PRODUCTS);
        setSelectedProductId(DEFAULT_PRODUCTS[0].id);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    initData();
  }, []);

  const liters = parseFloat(litersStr) || 0;
  const pricePerLiter = parseFloat(pricePerLiterStr) || 0;
  const calculatedTotal = liters * pricePerLiter;
  const finalAmount = isCustomAmount
    ? parseFloat(manualAmountStr) || 0
    : calculatedTotal;

  const handleProductChange = (newProductId: string) => {
    setSelectedProductId(newProductId);
  };

  const handleToggleCustomAmount = () => {
    if (!isCustomAmount) {
      setManualAmountStr(calculatedTotal.toString());
    }
    setIsCustomAmount(!isCustomAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const targetCustomerName = customerName.trim();
    const targetPhoneNumber = phoneNumber.trim();
    if (!targetCustomerName) {
      setErrorMsg("Please enter a customer name.");
      return;
    }

    if (liters <= 0) {
      setErrorMsg("Please enter liters sold on credit (> 0).");
      return;
    }

    if (pricePerLiter <= 0) {
      setErrorMsg("Please enter a valid price per liter (> Rs. 0).");
      return;
    }

    if (finalAmount <= 0) {
      setErrorMsg("Total credit amount must be greater than Rs. 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const product = products.find((p) => p.id === selectedProductId);
      const productName = product ? product.name : "Fuel";

      await addPendingLedgerTx({
        customer_name: targetCustomerName,
        phone_number: targetPhoneNumber,
        worker_id: activeShift?.user_id,
        issued_by_worker: activeShift?.user_id,
        liters,
        amount: finalAmount,
        price_per_liter: pricePerLiter,
        applied_sp: pricePerLiter,
        transaction_type: "credit",
      });
      onSaleRecorded?.();

      const isOnline = typeof navigator !== "undefined" && navigator.onLine;
      setSuccessMsg(
        `Credit sale of ${liters}L ${productName} (Rs. ${finalAmount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}) recorded for "${targetCustomerName}"! ${
          isOnline
            ? "⚡ Auto-synced to Cloud instantly."
            : "Saved offline to Dexie (will sync when online)."
        }`
      );

      // Reset form inputs for next manual entry
      setCustomerName("");
      setPhoneNumber("");
      setLitersStr("");
      setPricePerLiterStr("");
      setManualAmountStr("");
      setIsCustomAmount(false);
    } catch (err: unknown) {
      console.error("Error logging credit sale to Dexie:", err);
      setErrorMsg("Failed to save credit sale locally to Dexie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl animate-pulse space-y-4">
        <div className="h-6 w-44 bg-zinc-800 rounded" />
        <div className="h-10 w-full bg-zinc-800/50 rounded-xl" />
        <div className="h-10 w-full bg-zinc-800/50 rounded-xl" />
        <div className="h-10 w-full bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Credit Sale</h2>
              <p className="text-xs text-zinc-400">
                Log fuel credit (Udhar) transaction to Dexie
              </p>
            </div>
          </div>

          <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
            Manual Udhar
          </span>
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

        <CreditSaleFields
          products={products}
          customerName={customerName}
          phoneNumber={phoneNumber}
          selectedProductId={selectedProductId}
          litersStr={litersStr}
          pricePerLiterStr={pricePerLiterStr}
          manualAmountStr={manualAmountStr}
          isCustomAmount={isCustomAmount}
          isLoadingProducts={isLoadingProducts}
          calculatedTotal={calculatedTotal}
          onSubmit={handleSubmit}
          onCustomerNameChange={setCustomerName}
          onPhoneNumberChange={setPhoneNumber}
          onProductChange={handleProductChange}
          onLitersChange={setLitersStr}
          onPricePerLiterChange={setPricePerLiterStr}
          onManualAmountChange={setManualAmountStr}
          onToggleCustomAmount={handleToggleCustomAmount}
        />
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          form="credit-sale-form"
          disabled={isSubmitting || !customerName.trim() || liters <= 0 || pricePerLiter <= 0}
          className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Saving to Dexie..." : "Log Credit Sale (Offline)"}
        </button>
      </div>
    </div>
  );
}
