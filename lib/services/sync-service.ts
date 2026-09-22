import { db } from "@/lib/offline-db";
import {
  syncShiftsToCloud,
  syncTransactionsToCloud,
  syncExpensesToCloud,
  syncLedgerToCloud,
  type ShiftPayload,
  type TransactionPayload,
  type ExpensePayload,
  type LedgerPayload,
} from "@/actions/db-actions";

export interface ProcessQueueResult {
  success: boolean;
  syncedShiftsCount: number;
  syncedSalesCount: number;
  syncedExpensesCount: number;
  syncedLedgerCount: number;
  pendingRemainingCount: number;
  error?: string;
}

/**
 * Returns total count of pending records across Dexie tables.
 */
export async function getPendingCount(): Promise<number> {
  try {
    const pendingShifts = await db.shifts
      .where("sync_status")
      .equals("pending")
      .count();
    const pendingSales = await db.pendingSales
      .where("sync_status")
      .equals("pending")
      .count();
    const pendingExpenses = await db.pendingExpenses
      .where("sync_status")
      .equals("pending")
      .count();
    const pendingLedger = await db.pendingLedgerTransactions
      .where("sync_status")
      .equals("pending")
      .count();
    return pendingShifts + pendingSales + pendingExpenses + pendingLedger;
  } catch (error) {
    console.error("Failed to query pending records count from Dexie:", error);
    return 0;
  }
}


/**
 * Processes un-synced offline records in Dexie and syncs them to Supabase.
 * Execution Order:
 * 1. Shifts (upserted to Supabase 'shifts' table to ensure FK requirements are satisfied)
 * 2. Sales / Transactions
 * 3. Expenses
 * Strict Error Fallback: Records are strictly retained as 'pending' unless
 * the server action returns success: true.
 */
export async function processOfflineQueue(): Promise<ProcessQueueResult> {
  let syncedShiftsCount = 0;
  let syncedSalesCount = 0;
  let syncedExpensesCount = 0;
  let syncedLedgerCount = 0;
  const errors: string[] = [];

  try {
    // 1. Process Pending Shifts -> shifts table FIRST (satisfies foreign key constraint)
    const pendingShifts = await db.shifts
      .where("sync_status")
      .equals("pending")
      .toArray();

    if (pendingShifts.length > 0) {
      const shiftPayloads: ShiftPayload[] = pendingShifts.map((shift) => ({
        shift_id: shift.shift_id,
        user_id: shift.user_id,
        start_time: shift.start_time,
        end_time: shift.end_time,
        created_at: shift.created_at,
      }));

      const shiftsResult = await syncShiftsToCloud(shiftPayloads);

      if (shiftsResult.success) {
        const shiftIds = pendingShifts
          .map((s) => s.id)
          .filter((id): id is number => id !== undefined);

        if (shiftIds.length > 0) {
          // Strictly update local Dexie status ONLY on success: true
          await db.shifts
            .where("id")
            .anyOf(shiftIds)
            .modify({ sync_status: "synced" });
        }
        syncedShiftsCount = shiftsResult.insertedCount ?? pendingShifts.length;
      } else {
        const errorDetails = `Shifts sync error: ${shiftsResult.error || "Unknown server error"}`;
        console.error("SYNC FAILED:", errorDetails);
        errors.push(errorDetails);
      }
    }

    // 2. Process Pending Sales -> transactions table
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

    // 3. Process Pending Expenses -> expenses table
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

    // 4. Process Pending Ledger Transactions -> ledger_transactions table
    const pendingLedger = await db.pendingLedgerTransactions
      .where("sync_status")
      .equals("pending")
      .toArray();

    if (pendingLedger.length > 0) {
      const ledgerPayloads: LedgerPayload[] = pendingLedger.map((tx) => ({
        customer_id: tx.customer_id,
        worker_id: tx.worker_id,
        liters: tx.liters,
        amount: tx.amount,
        applied_sp: tx.applied_sp,
        transaction_type: tx.transaction_type,
        created_at: tx.created_at,
      }));

      const ledgerResult = await syncLedgerToCloud(ledgerPayloads);

      if (ledgerResult.success) {
        const ledgerIds = pendingLedger
          .map((l) => l.id)
          .filter((id): id is number => id !== undefined);

        if (ledgerIds.length > 0) {
          // Strictly update local Dexie status ONLY on success: true
          await db.pendingLedgerTransactions
            .where("id")
            .anyOf(ledgerIds)
            .modify({ sync_status: "synced" });
        }
        syncedLedgerCount = ledgerResult.insertedCount ?? pendingLedger.length;
      } else {
        // Server error or unreachable: strictly keep records as 'pending'
        const errorDetails = `Ledger sync error: ${ledgerResult.error || "Unknown server error"}`;
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
        syncedShiftsCount,
        syncedSalesCount,
        syncedExpensesCount,
        syncedLedgerCount,
        pendingRemainingCount,
        error: fullErrorMessage,
      };
    }

    return {
      success: true,
      syncedShiftsCount,
      syncedSalesCount,
      syncedExpensesCount,
      syncedLedgerCount,
      pendingRemainingCount,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unexpected error in processOfflineQueue";
    console.error("SYNC FAILED:", errorMsg, err);
    const pendingRemainingCount = await getPendingCount();
    return {
      success: false,
      syncedShiftsCount: 0,
      syncedSalesCount,
      syncedExpensesCount,
      syncedLedgerCount: 0,
      pendingRemainingCount,
      error: errorMsg,
    };
  }
}


