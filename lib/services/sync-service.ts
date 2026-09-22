import { db } from "@/lib/offline-db";
import {
  syncTransactionsToCloud,
  syncExpensesToCloud,
  type TransactionPayload,
  type ExpensePayload,
} from "@/actions/db-actions";

export interface ProcessQueueResult {
  success: boolean;
  syncedSalesCount: number;
  syncedExpensesCount: number;
  pendingRemainingCount: number;
  error?: string;
}

/**
 * Returns total count of pending records across Dexie tables.
 */
export async function getPendingCount(): Promise<number> {
  try {
    const pendingSales = await db.pendingSales
      .where("sync_status")
      .equals("pending")
      .count();
    const pendingExpenses = await db.pendingExpenses
      .where("sync_status")
      .equals("pending")
      .count();
    const pendingLedger = await db.pendingLedger
      .where("sync_status")
      .equals("pending")
      .count();
    return pendingSales + pendingExpenses + pendingLedger;
  } catch (error) {
    console.error("Failed to query pending records count from Dexie:", error);
    return 0;
  }
}

/**
 * Processes un-synced offline records in Dexie and syncs them to Supabase.
 * Strict Error Fallback: Records are strictly retained as 'pending' unless
 * the server action returns success: true.
 */
export async function processOfflineQueue(): Promise<ProcessQueueResult> {
  let syncedSalesCount = 0;
  let syncedExpensesCount = 0;
  const errors: string[] = [];

  try {
    // 1. Process Pending Sales -> transactions table
    const pendingSales = await db.pendingSales
      .where("sync_status")
      .equals("pending")
      .toArray();

    if (pendingSales.length > 0) {
      const transactionPayloads: TransactionPayload[] = pendingSales.map(
        (sale) => ({
          shift_id: sale.shift_id,
          product_id: sale.product_id,
          type: "sale",
          liters: sale.total_liters,
          applied_sp: sale.applied_sp,
          applied_cp: sale.applied_cp,
          total_amount: sale.total_liters * sale.applied_sp,
          created_at: sale.created_at,
        })
      );

      const salesResult = await syncTransactionsToCloud(transactionPayloads);

      if (salesResult.success) {
        const salesIds = pendingSales
          .map((s) => s.id)
          .filter((id): id is number => id !== undefined);

        if (salesIds.length > 0) {
          // Strictly update local Dexie status ONLY on success: true
          await db.pendingSales
            .where("id")
            .anyOf(salesIds)
            .modify({ sync_status: "synced" });
        }
        syncedSalesCount = salesResult.insertedCount ?? pendingSales.length;
      } else {
        // Server error or unreachable: strictly keep records as 'pending'
        const errorDetails = `Sales sync error: ${salesResult.error || "Unknown server error"}`;
        console.error("SYNC FAILED:", errorDetails);
        errors.push(errorDetails);
      }
    }

    // 2. Process Pending Expenses -> expenses table
    const pendingExpenses = await db.pendingExpenses
      .where("sync_status")
      .equals("pending")
      .toArray();

    if (pendingExpenses.length > 0) {
      const expensePayloads: ExpensePayload[] = pendingExpenses.map((exp) => ({
        shift_id: exp.shift_id,
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        created_at: exp.created_at,
      }));

      const expensesResult = await syncExpensesToCloud(expensePayloads);

      if (expensesResult.success) {
        const expenseIds = pendingExpenses
          .map((e) => e.id)
          .filter((id): id is number => id !== undefined);

        if (expenseIds.length > 0) {
          // Strictly update local Dexie status ONLY on success: true
          await db.pendingExpenses
            .where("id")
            .anyOf(expenseIds)
            .modify({ sync_status: "synced" });
        }
        syncedExpensesCount = expensesResult.insertedCount ?? pendingExpenses.length;
      } else {
        // Server error or unreachable: strictly keep records as 'pending'
        const errorDetails = `Expenses sync error: ${expensesResult.error || "Unknown server error"}`;
        console.error("SYNC FAILED:", errorDetails);
        errors.push(errorDetails);
      }
    }

    const pendingRemainingCount = await getPendingCount();

    if (errors.length > 0) {
      const fullErrorMessage = errors.join("; ");
      console.error("SYNC FAILED (Batch Summary):", fullErrorMessage);
      return {
        success: false,
        syncedSalesCount,
        syncedExpensesCount,
        pendingRemainingCount,
        error: fullErrorMessage,
      };
    }

    return {
      success: true,
      syncedSalesCount,
      syncedExpensesCount,
      pendingRemainingCount,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unexpected error in processOfflineQueue";
    console.error("SYNC FAILED:", errorMsg, err);
    const pendingRemainingCount = await getPendingCount();
    return {
      success: false,
      syncedSalesCount,
      syncedExpensesCount,
      pendingRemainingCount,
      error: errorMsg,
    };
  }
}
