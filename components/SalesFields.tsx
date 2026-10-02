"use client";

import { useId, type FormEventHandler } from "react";

export interface SalesProduct {
  id: string;
  name: string;
  current_sp?: number;
  current_cp?: number;
}

interface SalesFieldsProps {
  products: SalesProduct[];
  productId: string;
  litersStr: string;
  pricePerLiterStr: string;
  isLoadingProducts: boolean;
  totalAmount: number;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onProductChange: (productId: string) => void;
  onLitersChange: (value: string) => void;
  onPricePerLiterChange: (value: string) => void;
}

export default function SalesFields({
  products,
  productId,
  litersStr,
  pricePerLiterStr,
  isLoadingProducts,
  totalAmount,
  onSubmit,
  onProductChange,
  onLitersChange,
  onPricePerLiterChange,
}: SalesFieldsProps) {
  const productInputId = useId();
  const litersInputId = useId();
  const priceInputId = useId();
  const totalAmountInputId = useId();

  return (
    <form id="sales-form" onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={productInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
          Product
        </label>
        <select
          id={productInputId}
          name="product_id"
          value={productId}
          onChange={(event) => onProductChange(event.target.value)}
          disabled={isLoadingProducts || products.length === 0}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors disabled:opacity-50"
        >
          {isLoadingProducts ? (
            <option value="">Loading products...</option>
          ) : products.length === 0 ? (
            <option value="">No products found in database</option>
          ) : (
            products
              .filter((p, i, arr) => arr.findIndex((x) => x.name === p.name) === i)
              .map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))
          )}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={litersInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
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
            onChange={(event) => onLitersChange(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
            required
          />
        </div>

        <div>
          <label htmlFor={priceInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
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
            onChange={(event) => onPricePerLiterChange(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor={totalAmountInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
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
  );
}