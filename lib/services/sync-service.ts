import { db } from "@/lib/offline-db";
import {
  syncPendingExpenses,
  syncPendingInventory,
  syncPendingLedger,
  syncPendingSales,
  syncPendingShifts,
} from "@/lib/services/offline-sync-steps";

export interface ProcessQueueResult {
  success: boolean;
  syncedShiftsCount: number;
  syncedSalesCount: number;
  syncedExpensesCount: number;
  syncedLedgerCount: number;
  syncedInventoryCount: number;
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
    const pendingInventory = await db.pendingInventory
      .where("sync_status")
      .equals("pending")
      .count();
    return (
      pendingShifts +
      pendingSales +
      pendingExpenses +
      pendingLedger +
      pendingInventory
    );
  } catch (error) {
    console.error("Failed to query pending records count from Dexie:", error);
    return 0;
  }
}

let isSyncing = false;
let pendingSyncRequest = false;

/**
 * Triggers background offline sync to cloud if the client browser has an active internet connection.
 * Non-blocking fire-and-forget designed to run immediately after Dexie writes.
 */
export function triggerAutoSyncIfOnline(): void {
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.onLine
  ) {
    processOfflineQueue().catch((err) => {
      console.warn("Background auto-sync encountered an error:", err);
    });
  }
}

/**
 * Processes un-synced offline records in Dexie and syncs them to Supabase.
 * Execution Order:
 * 1. Shifts (upserted to Supabase 'shifts' table to ensure FK requirements are satisfied)
 * 2. Sales / Transactions
 * 3. Expenses
 * 4. Ledger Transactions
 * 5. Inventory Arrivals
 * Strict Error Fallback: Records are strictly retained as 'pending' unless
 * the server action returns success: true.
 */
export async function processOfflineQueue(): Promise<ProcessQueueResult> {
  if (
    typeof navigator !== "undefined" &&
    !navigator.onLine
  ) {
    return {
      success: true,
      syncedShiftsCount: 0,
      syncedSalesCount: 0,
      syncedExpensesCount: 0,
      syncedLedgerCount: 0,
      syncedInventoryCount: 0,
      pendingRemainingCount: await getPendingCount(),
    };
  }

  if (isSyncing) {
    pendingSyncRequest = true;
    return {
      success: true,
      syncedShiftsCount: 0,
      syncedSalesCount: 0,
      syncedExpensesCount: 0,
      syncedLedgerCount: 0,
      syncedInventoryCount: 0,
      pendingRemainingCount: await getPendingCount(),
    };
  }

  isSyncing = true;
  let syncedShiftsCount = 0;
  let syncedSalesCount = 0;
  let syncedExpensesCount = 0;
  let syncedLedgerCount = 0;
  let syncedInventoryCount = 0;
  const errors: string[] = [];

  try {
    const shiftsResult = await syncPendingShifts();
    syncedShiftsCount = shiftsResult.syncedCount;
    if (shiftsResult.error) errors.push(shiftsResult.error);

    const salesResult = await syncPendingSales();
    syncedSalesCount = salesResult.syncedCount;
    if (salesResult.error) errors.push(salesResult.error);

    const expensesResult = await syncPendingExpenses();
    syncedExpensesCount = expensesResult.syncedCount;
    if (expensesResult.error) errors.push(expensesResult.error);

    const ledgerResult = await syncPendingLedger();
    syncedLedgerCount = ledgerResult.syncedCount;
    if (ledgerResult.error) errors.push(ledgerResult.error);

    const inventoryResult = await syncPendingInventory();
    syncedInventoryCount = inventoryResult.syncedCount;
    if (inventoryResult.error) errors.push(inventoryResult.error);

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
        syncedInventoryCount,
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
      syncedInventoryCount,
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
      syncedInventoryCount: 0,
      pendingRemainingCount,
      error: errorMsg,
    };
  } finally {
    isSyncing = false;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("offline-sync-complete"));
    }
    if (pendingSyncRequest) {
      pendingSyncRequest = false;
      setTimeout(() => {
        triggerAutoSyncIfOnline();
      }, 300);
    }
  }
}


