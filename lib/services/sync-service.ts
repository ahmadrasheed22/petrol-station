import { db } from "@/lib/offline-db";
import {
  syncShiftsToCloud,
  syncTransactionsToCloud,
  syncExpensesToCloud,
  syncLedgerToCloud,
  syncInventoryToCloud,
  type ShiftPayload,
  type TransactionPayload,
  type ExpensePayload,
  type LedgerPayload,
  type InventoryPayload,
} from "@/actions/db-actions";

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
    // 1. Process Pending Shifts -> shifts table FIRST (satisfies foreign key constraint)
    const pendingShifts = await db.shifts
      .where("sync_status")
      .equals("pending")
      .toArray();

    if (pendingShifts.length > 0) {
      const shiftPayloads: ShiftPayload[] = pendingShifts.map((shift) => ({
        shift_id: shift.shift_id,
        user_id: shift.user_id,
        worker_name: shift.worker_name,
        product_id: shift.product_id,
        product_name: shift.product_name,
        price_per_liter: shift.price_per_liter ?? 0,
        opening_meter: shift.opening_meter ?? 0,
        closing_meter: shift.closing_meter ?? 0,
        testing_liters: shift.testing_liters ?? 0,
        total_liters: shift.total_liters ?? 0,
        expected_cash: shift.expected_cash ?? 0,
        actual_cash: shift.actual_cash ?? 0,
        shortage_amount: shift.shortage_amount ?? 0,
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
        (sale) => {
          const price = sale.price_per_liter ?? sale.applied_sp ?? 0;
          return {
            shift_id: sale.shift_id,
            product_id: sale.product_id,
            type: "sale",
            liters: sale.total_liters,
            price_per_liter: price,
            applied_sp: price,
            applied_cp: sale.applied_cp,
            total_amount: sale.total_liters * price,
            created_at: sale.created_at,
          };
        }
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
          .map((expense) => expense.id)
          .filter((id): id is number => id !== undefined);

        if (expenseIds.length > 0) {
          await db.pendingExpenses.where("id").anyOf(expenseIds).delete();
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
      const ledgerPayloads: LedgerPayload[] = pendingLedger.map((tx) => {
        const price = tx.price_per_liter ?? tx.applied_sp ?? 0;
        return {
          customer_id: tx.customer_id,
          customer_name: tx.customer_name,
          worker_id: tx.worker_id,
          liters: tx.liters,
          amount: tx.amount,
          price_per_liter: price,
          applied_sp: price,
          transaction_type: tx.transaction_type,
          created_at: tx.created_at,
        };
      });

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

    // 5. Process Pending Inventory -> inventory_arrivals table
    const pendingInventory = await db.pendingInventory
      .where("sync_status")
      .equals("pending")
      .toArray();

    if (pendingInventory.length > 0) {
      const inventoryPayloads: InventoryPayload[] = pendingInventory.map(
        (item) => ({
          product_id: item.product_id,
          billed_liters: item.billed_liters,
          actual_received_liters: item.actual_received_liters,
          cost_per_liter: item.cost_per_liter,
          created_at: item.created_at,
        })
      );

      const inventoryResult = await syncInventoryToCloud(inventoryPayloads);

      if (inventoryResult.success) {
        const inventoryIds = pendingInventory
          .map((i) => i.id)
          .filter((id): id is number => id !== undefined);

        if (inventoryIds.length > 0) {
          // Strictly update local Dexie status ONLY on success: true
          await db.pendingInventory
            .where("id")
            .anyOf(inventoryIds)
            .modify({ sync_status: "synced" });
        }
        syncedInventoryCount =
          inventoryResult.insertedCount ?? pendingInventory.length;
      } else {
        // Server error or unreachable: strictly keep records as 'pending'
        const errorDetails = `Inventory sync error: ${inventoryResult.error || "Unknown server error"}`;
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
    if (pendingSyncRequest) {
      pendingSyncRequest = false;
      setTimeout(() => {
        triggerAutoSyncIfOnline();
      }, 300);
    }
  }
}


