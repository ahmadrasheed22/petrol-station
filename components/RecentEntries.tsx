"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, PendingExpense, PendingLedgerTransaction } from "@/lib/offline-db";
import { syncExpensesToCloud, syncShiftsToCloud } from "@/actions/db-actions";
import RecentEntriesView, {
  type EntryType,
  type UnifiedEntry,
} from "@/components/RecentEntriesView";

export default function RecentEntries({
  initialFilter = "sale",
  showFilterTabs = true,
}: {
  initialFilter?: "expense" | "sale";
  showFilterTabs?: boolean;
}) {
  const [filter, setFilter] = useState<EntryType>(initialFilter);
  const [uploadingExpenseIds, setUploadingExpenseIds] = useState<Set<number>>(new Set());
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const handleExpenseUpload = async (expenseId: number) => {
    const expense = await db.pendingExpenses.get(expenseId);
    if (!expense) return;

    setUploadError(null);
    setUploadingExpenseIds((ids) => new Set(ids).add(expenseId));

    try {
      await db.pendingExpenses.delete(expenseId);
      if (expense.shift_id) {
        const shift = await db.shifts.where("shift_id").equals(expense.shift_id).first();
        if (shift) {
          const shiftResult = await syncShiftsToCloud([{
            shift_id: shift.shift_id,
            user_id: shift.user_id,
            worker_name: shift.worker_name,
            start_time: shift.start_time,
            created_at: shift.created_at,
          }]);
          if (!shiftResult.success) throw new Error(shiftResult.error || "Failed to upload duty session.");
        }
      }

      const result = await syncExpensesToCloud([{
        shift_id: expense.shift_id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        created_at: expense.created_at,
      }]);
      if (!result.success) throw new Error(result.error || "Expense upload failed.");
    } catch (error) {
      await db.pendingExpenses.put(expense);
      setUploadError(error instanceof Error ? error.message : "Failed to upload expense.");
    } finally {
      setUploadingExpenseIds((ids) => {
        const remaining = new Set(ids);
        remaining.delete(expenseId);
        return remaining;
      });
    }
  };

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
    <RecentEntriesView
      filter={filter}
      showFilterTabs={showFilterTabs}
      saleCount={saleEntries.length}
      expenseCount={expenseEntries.length}
      displayedEntries={displayedEntries}
      summary={activeSummary}
      uploadingExpenseIds={uploadingExpenseIds}
      uploadError={uploadError}
      onFilterChange={setFilter}
      onExpenseUpload={(expenseId) => void handleExpenseUpload(expenseId)}
    />
  );
}
