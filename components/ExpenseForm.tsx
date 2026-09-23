"use client";

import { useState, useEffect, useId } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";
import { addPendingExpense } from "@/lib/services/offline-service";

const CATEGORIES = [
  "Machine Maintenance",
  "Guest/Hospitality",
  "Utility Bills",
  "Miscellaneous",
];

export default function ExpenseForm() {
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [amountStr, setAmountStr] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categoryInputId = useId();
  const amountInputId = useId();
  const descriptionInputId = useId();

  // Safeguard against SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
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

  const amount = parseFloat(amountStr) || 0;
  const hasActiveDuty = Boolean(activeShift);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!hasActiveDuty) {
      setErrorMsg("Form locked: You must have an active shift duty to log expenses.");
      return;
    }

    if (amount <= 0) {
      setErrorMsg("Please enter a valid amount (greater than Rs. 0).");
      return;
    }

    if (!category) {
      setErrorMsg("Please select a category.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addPendingExpense({
        shift_id: activeShift?.shift_id,
        amount,
        category,
        description: description.trim() || undefined,
      });

      const isOnline = typeof navigator !== "undefined" && navigator.onLine;
      setSuccessMsg(
        `Expense of Rs. ${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} (${category}) recorded! ${
          isOnline
            ? "⚡ Auto-synced to Cloud instantly."
            : "Saved offline to Dexie (will sync when online)."
        }`
      );
      setAmountStr("");
      setDescription("");
    } catch (err: unknown) {
      console.error("Error saving expense to Dexie:", err);
      setErrorMsg("Failed to save expense record locally.");
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
                  d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Expense</h2>
              <p className="text-xs text-zinc-400">
                Record daily station expenses to Dexie
              </p>
            </div>
          </div>

          {!hasActiveDuty ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              <svg className="h-3.5 w-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>No Active Duty (Locked)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Duty Active</span>
            </span>
          )}
        </div>

        {/* Lock Banner if no active duty */}
        {!hasActiveDuty && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
            <svg className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <span className="font-semibold">Form Locked:</span> You must start a shift duty in the terminal before recording expenses.
            </div>
          </div>
        )}

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
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={!hasActiveDuty || isSubmitting} className={`space-y-4 transition-opacity ${!hasActiveDuty ? "opacity-50" : ""}`}>
            <div>
              <label
                htmlFor={categoryInputId}
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Category
              </label>
              <select
                id={categoryInputId}
                name="category"
                value={category}
                disabled={!hasActiveDuty || isSubmitting}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors disabled:cursor-not-allowed"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={amountInputId}
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
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
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors disabled:cursor-not-allowed"
                required
              />
            </div>

            <div>
              <label
                htmlFor={descriptionInputId}
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Description
              </label>
              <input
                id={descriptionInputId}
                name="description"
                type="text"
                placeholder={!hasActiveDuty ? "Locked until duty starts" : "e.g. Generator Maintenance, Tea & Water, Station Cleaning"}
                value={description}
                disabled={!hasActiveDuty || isSubmitting}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors disabled:cursor-not-allowed"
              />
            </div>
          </fieldset>
        </form>
      </div>

      <div>
        <button
          type="submit"
          form="expense-form"
          disabled={!hasActiveDuty || isSubmitting}
          className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
            !hasActiveDuty
              ? "bg-zinc-800 text-zinc-400 opacity-50 cursor-not-allowed border border-zinc-700/50"
              : "bg-amber-600 hover:bg-amber-500 shadow-amber-950/50 cursor-pointer"
          }`}
        >
          {isSubmitting
            ? "Saving Expense..."
            : !hasActiveDuty
            ? "Start a duty to log expenses"
            : "Log Expense Record (Offline)"}
        </button>
      </div>
    </div>
  );
}
