"use client";

import { useId, type FormEventHandler } from "react";

export const EXPENSE_CATEGORIES = [
  "Machine Maintenance",
  "Guest/Hospitality",
  "Utility Bills",
  "Miscellaneous",
  "Worker Expense",
  "Owner Expense",
];

interface ExpenseFieldsProps {
  category: string;
  amountStr: string;
  description: string;
  hasActiveDuty: boolean;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCategoryChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export default function ExpenseFields({
  category,
  amountStr,
  description,
  hasActiveDuty,
  isSubmitting,
  onSubmit,
  onCategoryChange,
  onAmountChange,
  onDescriptionChange,
}: ExpenseFieldsProps) {
  const categoryInputId = useId();
  const amountInputId = useId();
  const descriptionInputId = useId();

  return (
    <form id="expense-form" onSubmit={onSubmit} className="space-y-4">
      <fieldset disabled={!hasActiveDuty || isSubmitting} className={`space-y-4 transition-opacity ${!hasActiveDuty ? "opacity-50" : ""}`}>
        <div>
          <label htmlFor={categoryInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
            Category
          </label>
          <select
            id={categoryInputId}
            name="category"
            value={category}
            disabled={!hasActiveDuty || isSubmitting}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors disabled:cursor-not-allowed"
          >
            {EXPENSE_CATEGORIES.map((expenseCategory) => (
              <option key={expenseCategory} value={expenseCategory}>{expenseCategory}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={amountInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
            Amount (Rs)
          </label>
          <input
            id={amountInputId}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder={!hasActiveDuty ? "Duty required to enter amount" : "0.00"}
            value={amountStr}
            disabled={!hasActiveDuty || isSubmitting}
            onChange={(event) => onAmountChange(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors disabled:cursor-not-allowed"
            required
          />
        </div>

        <div>
          <label htmlFor={descriptionInputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
            Description
          </label>
          <input
            id={descriptionInputId}
            name="description"
            type="text"
            placeholder={!hasActiveDuty ? "Locked until duty starts" : "e.g. Generator Maintenance, Tea & Water, Station Cleaning"}
            value={description}
            disabled={!hasActiveDuty || isSubmitting}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors disabled:cursor-not-allowed"
          />
        </div>
      </fieldset>
    </form>
  );
}