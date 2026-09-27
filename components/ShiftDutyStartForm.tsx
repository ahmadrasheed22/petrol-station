"use client";

import { useId, type FormEventHandler } from "react";

export interface ShiftDutyProduct {
  id: string;
  name: string;
  current_sp?: number;
  current_cp?: number;
}

interface ShiftDutyStartFormProps {
  products: ShiftDutyProduct[];
  selectedProductId: string;
  startPriceStr: string;
  openingMeterStr: string;
  isLoadingProducts: boolean;
  isProcessing: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onProductChange: (productId: string) => void;
  onPriceChange: (value: string) => void;
  onOpeningMeterChange: (value: string) => void;
}

export default function ShiftDutyStartForm({
  products,
  selectedProductId,
  startPriceStr,
  openingMeterStr,
  isLoadingProducts,
  isProcessing,
  onSubmit,
  onProductChange,
  onPriceChange,
  onOpeningMeterChange,
}: ShiftDutyStartFormProps) {
  const productSelectId = useId();
  const startPriceId = useId();
  const openingMeterId = useId();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={productSelectId} className="block text-xs font-medium text-zinc-400 mb-1.5">
          Nozzle Fuel Product
        </label>
        <select
          id={productSelectId}
          value={selectedProductId}
          onChange={(event) => onProductChange(event.target.value)}
          disabled={isLoadingProducts}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
          required
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={startPriceId} className="block text-xs font-medium text-zinc-400 mb-1.5">
            Today&apos;s Price (Rs./Liter)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-mono">Rs.</span>
            <input
              id={startPriceId}
              type="number"
              step="0.01"
              min="1"
              value={startPriceStr}
              onChange={(event) => onPriceChange(event.target.value)}
              placeholder="270.00"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors font-mono"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor={openingMeterId} className="block text-xs font-medium text-zinc-400 mb-1.5">
            Opening Meter Reading
          </label>
          <input
            id={openingMeterId}
            type="number"
            step="0.01"
            min="0"
            value={openingMeterStr}
            onChange={(event) => onOpeningMeterChange(event.target.value)}
            placeholder="e.g. 154230.50"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors font-mono"
            required
          />
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
  );
}