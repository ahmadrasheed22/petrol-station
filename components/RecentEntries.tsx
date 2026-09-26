"use client";

import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, PendingExpense, PendingLedgerTransaction } from "@/lib/offline-db";

type EntryType = "expense" | "sale";

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

export default function RecentEntries() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<"expense" | "sale">("sale");

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
      if (tx.transaction_type !== "credit") return;
      const isToday = new Date(tx.created_at).toDateString() === todayStr;
      if (isToday) {
        const rate = tx.price_per_liter || tx.applied_sp || 0;
        const liters = tx.liters || 0;
        list.push({
          uid: `ledger-${tx.id}`,
          originalId: tx.id,
          type: "sale",
          title: tx.customer_name || "Fuel Sale",
          subtitle: liters > 0 ? `${liters} Liters @ Rs. ${rate}/L` : "Fuel Sale",
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
    return todayEntries.filter((e) => e.type === filter);
  }, [todayEntries, filter]);

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl animate-pulse space-y-4">
        <div className="h-6 w-52 bg-zinc-800 rounded" />
        <div className="h-20 w-full bg-zinc-800/40 rounded-xl" />
      </div>
    );
  }

  const expenseEntries = todayEntries.filter((e) => e.type === "expense");
  const saleEntries = todayEntries.filter((e) => e.type === "sale");

  const expenseTotal = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const fuelSalesTotalAmount = saleEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const fuelSalesTotalLiters = saleEntries.reduce((sum, entry) => sum + (entry.liters || 0), 0);
  const activeSummary =
    filter === "sale"
      ? {
          label: "Total Fuel Sold",
          value: `${fuelSalesTotalLiters.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} L`,
          helper: `Fuel Sales: Rs. ${fuelSalesTotalAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        }
      : {
          label: "Total Expenses",
          value: `Rs. ${expenseTotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          helper: `${expenseEntries.length} expense${expenseEntries.length === 1 ? "" : "s"} recorded today`,
        };

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
              Audit log of today&apos;s fuel sales and expenses (immutable records)
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setFilter("sale")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "sale"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Fuel Sales ({saleEntries.length})
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
            Expenses ({expenseEntries.length})
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{activeSummary.label}</p>
            <p className="mt-1 text-2xl font-black text-white">{activeSummary.value}</p>
          </div>
          <p className="text-xs text-zinc-400">{activeSummary.helper}</p>
        </div>
      </div>

      {/* Entries List */}
      {displayedEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-400">No {filter === "sale" ? "fuel sales" : "expenses"} logged today</p>
          <p className="text-xs text-zinc-500">
            Fuel sales and expenses will appear here as they are recorded. Records are permanently locked upon submission.
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
                    {entry.type === "expense" ? "Expense" : "Fuel Sale"}
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

                {/* Right side: Amount and Locked Security Indicator (Edit & Delete permanently removed for fraud prevention) */}
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

                  <div className="flex items-center ml-2">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400 px-2.5 py-1 bg-zinc-900/90 rounded-lg border border-zinc-800"
                      title="Submitted record is locked against alteration or deletion"
                    >
                      <svg
                        className="h-3 w-3 text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span>Locked</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
