"use client";

import { useId, type FormEventHandler } from "react";

export interface CreditSaleProduct {
  id: string;
  name: string;
  current_sp?: number;
  current_cp?: number;
}

interface CreditSaleFieldsProps {
  products: CreditSaleProduct[];
  customerName: string;
  phoneNumber: string;
  selectedProductId: string;
  litersStr: string;
  pricePerLiterStr: string;
  manualAmountStr: string;
  isCustomAmount: boolean;
  isLoadingProducts: boolean;
  calculatedTotal: number;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCustomerNameChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onLitersChange: (value: string) => void;
  onPricePerLiterChange: (value: string) => void;
  onManualAmountChange: (value: string) => void;
  onToggleCustomAmount: () => void;
}

export default function CreditSaleFields({
  products,
  customerName,
  phoneNumber,
  selectedProductId,
  litersStr,
  pricePerLiterStr,
  manualAmountStr,
  isCustomAmount,
  isLoadingProducts,
  calculatedTotal,
  onSubmit,
  onCustomerNameChange,
  onPhoneNumberChange,
  onProductChange,
  onLitersChange,
  onPricePerLiterChange,
  onManualAmountChange,
  onToggleCustomAmount,
}: CreditSaleFieldsProps) {
  const productSelectId = useId();
  const phoneInputId = useId();
  const litersInputId = useId();
  const priceInputId = useId();
  const amountInputId = useId();

  return (
    <form id="credit-sale-form" onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="customer_name" className="block text-xs font-medium text-zinc-400 mb-1.5">
          Customer Name (Manual Entry)
        </label>
        <input
          id="customer_name"
          name="customer_name"
          type="text"
          autoComplete="off"
          value={customerName}
          onChange={(event) => onCustomerNameChange(event.target.value)}
          placeholder="e.g. Malik Transport, Aslam Rickshaw, Ch Tariq..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          required
        />
        <p className="text-[11px] text-zinc-500 mt-1">
          Type any customer or driver name manually without dropdown restrictions.
        </p>
      </div>

      <div>
        <label htmlFor={phoneInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
          Customer Phone Number
        </label>
        <input
          id={phoneInputId}
          name="phone_number"
          type="tel"
          autoComplete="off"
          value={phoneNumber}
          onChange={(event) => onPhoneNumberChange(event.target.value)}
          placeholder="e.g. 03XX XXXXXXX"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      <div>
        <label htmlFor={productSelectId} className="block text-xs font-medium text-zinc-400 mb-1.5">
          Fuel Product
        </label>
        <select
          id={productSelectId}
          name="product_id"
          value={selectedProductId}
          onChange={(event) => onProductChange(event.target.value)}
          disabled={isLoadingProducts || products.length === 0}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors disabled:opacity-50"
        >
          {isLoadingProducts ? (
            <option value="">Loading products...</option>
          ) : (
            products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={litersInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
            Liters Sold
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
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            required
          />
        </div>

        <div>
          <label htmlFor={priceInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
            Price per Liter (Rs)
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
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={amountInputId} className="text-xs font-medium text-zinc-400">
            Total Credit Amount (Rs)
          </label>
          <button
            type="button"
            onClick={onToggleCustomAmount}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            {isCustomAmount ? "Use Auto Calculated" : "Override Amount"}
          </button>
        </div>

        {isCustomAmount ? (
          <input
            id={amountInputId}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Enter manual credit amount"
            value={manualAmountStr}
            onChange={(event) => onManualAmountChange(event.target.value)}
            className="w-full rounded-xl border border-indigo-500/40 bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-indigo-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            required
          />
        ) : (
          <input
            id={amountInputId}
            name="amount"
            type="text"
            readOnly
            value={
              calculatedTotal > 0
                ? `Rs. ${calculatedTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "Rs. 0.00"
            }
            className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/80 px-3.5 py-2.5 text-sm font-semibold text-indigo-400 cursor-not-allowed select-none"
          />
        )}
      </div>
    </form>
  );
}