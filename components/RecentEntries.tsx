"use client";

import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, PendingExpense, PendingLedgerTransaction } from "@/lib/offline-db";
import {
  updatePendingExpense,
  deletePendingExpense,
  updatePendingLedgerTx,
  deletePendingLedgerTx,
} from "@/lib/services/offline-service";

type EntryType = "expense" | "credit";

interface UnifiedEntry {
  uid: string;
  originalId: number;
  type: EntryType;
  title: string;
  subtitle: string;
  amount: number;
  liters?: number;
  pricePerLiter?: number;
  category?: string;
  description?: string;
  customerName?: string;
  syncStatus: "pending" | "synced" | "failed";
  createdAt: string;
}

const EXPENSE_CATEGORIES = ["Maintenance", "Supplies", "Utility", "Other"];

export default function RecentEntries() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | "expense" | "credit">("all");
  const [editingEntry, setEditingEntry] = useState<UnifiedEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<UnifiedEntry | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit form state
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmountStr, setEditAmountStr] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editLitersStr, setEditLitersStr] = useState("");
  const [editPriceStr, setEditPriceStr] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reactive Dexie queries
  const expenses = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.pendingExpenses.toArray();
    },
    [],
    []
  );

  const ledgerTxs = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.pendingLedgerTransactions.toArray();
    },
    [],
    []
  );

  // Filter for today's entries and unify into a sorted list
  const todayEntries = useMemo(() => {
    const todayStr = new Date().toDateString();
    const list: UnifiedEntry[] = [];

    // Map expenses
    (expenses || []).forEach((exp: PendingExpense) => {
      if (!exp.id) return;
      const isToday = new Date(exp.created_at).toDateString() === todayStr;
      if (isToday) {
        list.push({
          uid: `exp-${exp.id}`,
          originalId: exp.id,
          type: "expense",
          title: exp.category,
          subtitle: exp.description || "Station Expense",
          amount: exp.amount,
          category: exp.category,
          description: exp.description,
          syncStatus: exp.sync_status,
          createdAt: exp.created_at,
        });
      }
    });

    // Map credit sales (ledger)
    (ledgerTxs || []).forEach((tx: PendingLedgerTransaction) => {
      if (!tx.id) return;
      const isToday = new Date(tx.created_at).toDateString() === todayStr;
      if (isToday) {
        const rate = tx.price_per_liter || tx.applied_sp || 0;
        const liters = tx.liters || 0;
        list.push({
          uid: `ledger-${tx.id}`,
          originalId: tx.id,
          type: "credit",
          title: tx.customer_name || "Credit Customer",
          subtitle: liters > 0 ? `${liters} Liters @ Rs. ${rate}/L` : "Fuel Credit",
          amount: tx.amount,
          liters,
          pricePerLiter: rate,
          customerName: tx.customer_name,
          syncStatus: tx.sync_status,
          createdAt: tx.created_at,
        });
      }
    });

    // Sort newest first
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [expenses, ledgerTxs]);

  // Filtered by selected tab
  const displayedEntries = useMemo(() => {
    if (filter === "all") return todayEntries;
    return todayEntries.filter((e) => e.type === filter);
  }, [todayEntries, filter]);

  // Open edit modal and populate state
  const handleOpenEdit = (entry: UnifiedEntry) => {
    setEditingEntry(entry);
    setEditAmountStr(entry.amount.toString());
    if (entry.type === "expense") {
      setEditCategory(entry.category || EXPENSE_CATEGORIES[0]);
      setEditDescription(entry.description || "");
    } else {
      setEditCustomerName(entry.customerName || "");
      setEditLitersStr(entry.liters?.toString() || "");
      setEditPriceStr(entry.pricePerLiter?.toString() || "");
    }
  };

  // Recalculate amount if editing credit sale
  const handleEditLitersOrPriceChange = (newLiters: string, newPrice: string) => {
    setEditLitersStr(newLiters);
    setEditPriceStr(newPrice);
    const l = parseFloat(newLiters) || 0;
    const p = parseFloat(newPrice) || 0;
    if (l > 0 && p > 0) {
      setEditAmountStr((l * p).toString());
    }
  };

  // Submit edit
  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const amt = parseFloat(editAmountStr) || 0;
    if (amt <= 0) {
      alert("Please enter a valid amount greater than Rs. 0");
      return;
    }

    setIsProcessing(true);
    try {
      if (editingEntry.type === "expense") {
        await updatePendingExpense(editingEntry.originalId, {
          category: editCategory,
          amount: amt,
          description: editDescription.trim() || undefined,
        });
        setActionNotice(`Expense updated to Rs. ${amt.toLocaleString()}!`);
      } else {
        const liters = parseFloat(editLitersStr) || 0;
        const rate = parseFloat(editPriceStr) || 0;
        const name = editCustomerName.trim() || "Walk-in Customer";
        await updatePendingLedgerTx(editingEntry.originalId, {
          customer_name: name,
          liters,
          price_per_liter: rate,
          amount: amt,
        });
        setActionNotice(`Credit entry for "${name}" updated!`);
      }
      setEditingEntry(null);
    } catch (err) {
      console.error("Failed to update entry:", err);
      alert("Error updating entry in offline database.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingEntry) return;

    setIsProcessing(true);
    try {
      if (deletingEntry.type === "expense") {
        await deletePendingExpense(deletingEntry.originalId);
        setActionNotice(`Expense record removed.`);
      } else {
        await deletePendingLedgerTx(deletingEntry.originalId);
        setActionNotice(`Credit sale record removed.`);
      }
      setDeletingEntry(null);
    } catch (err) {
      console.error("Failed to delete entry:", err);
      alert("Error deleting entry from offline database.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl animate-pulse space-y-4">
        <div className="h-6 w-52 bg-zinc-800 rounded" />
        <div className="h-20 w-full bg-zinc-800/40 rounded-xl" />
      </div>
    );
  }

  const expenseCount = todayEntries.filter((e) => e.type === "expense").length;
  const creditCount = todayEntries.filter((e) => e.type === "credit").length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Recent Entries (Today)</h2>
            <p className="text-xs text-zinc-400">
              Review, edit, or delete today&apos;s logged expenses and credit sales
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All ({todayEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("expense")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "expense"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Expenses ({expenseCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("credit")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "credit"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Credit Sales ({creditCount})
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center justify-between">
          <span>{actionNotice}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Entries List */}
      {displayedEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-400">No entries logged today</p>
          <p className="text-xs text-zinc-500">
            Expenses logged via the &quot;Log Expense&quot; form and credit sales logged via
            &quot;Khata&quot; will appear here with instant edit and delete capabilities.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedEntries.map((entry) => {
            const isPending = entry.syncStatus === "pending";
            const timeStr = new Date(entry.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            return (
              <div
                key={entry.uid}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/50 transition-colors"
              >
                {/* Left side: Type badge, title, subtitle & time */}
                <div className="flex items-start sm:items-center gap-3">
                  <span
                    className={`mt-0.5 sm:mt-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shrink-0 ${
                      entry.type === "expense"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    }`}
                  >
                    {entry.type === "expense" ? "Expense" : "Credit (Udhar)"}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {entry.title}
                      </span>
                      <span className="text-[11px] text-zinc-500">{timeStr}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{entry.subtitle}</p>
                  </div>
                </div>

                {/* Right side: Amount, Sync badge, and Edit/Delete action buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      Rs. {entry.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isPending ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {isPending ? "Pending Offline" : "Synced to Cloud"}
                    </span>
                  </div>

                  {/* Edit and Delete Buttons */}
                  <div className="flex items-center gap-1.5 ml-2">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
                          title="Edit this entry"
                        >
                          <svg
                            className="h-3.5 w-3.5 text-zinc-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingEntry(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-400 transition-colors cursor-pointer"
                          title="Delete this entry"
                        >
                          <svg
                            className="h-3.5 w-3.5 text-rose-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-zinc-500 px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">
                        Locked (Synced)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Edit {editingEntry.type === "expense" ? "Expense" : "Credit Sale"} Entry
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-zinc-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Expense Edit Fields */}
            {editingEntry.type === "expense" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Amount (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmountStr}
                    onChange={(e) => setEditAmountStr(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="e.g. Generator Maintenance, Tea"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Credit Sale Edit Fields */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Liters Sold
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editLitersStr}
                      onChange={(e) =>
                        handleEditLitersOrPriceChange(e.target.value, editPriceStr)
                      }
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Price / Liter (Rs)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editPriceStr}
                      onChange={(e) =>
                        handleEditLitersOrPriceChange(editLitersStr, e.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Total Amount (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmountStr}
                    onChange={(e) => setEditAmountStr(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-indigo-400 focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isProcessing ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Entry?</h3>
                <p className="text-xs text-zinc-400">This action removes it from Dexie</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Are you sure you want to delete this {deletingEntry.type === "expense" ? "expense" : "credit sale"} entry for{" "}
              <strong className="text-white">{deletingEntry.title}</strong> of{" "}
              <strong className="text-white">Rs. {deletingEntry.amount.toLocaleString()}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isProcessing ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
