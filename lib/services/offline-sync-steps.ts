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

export interface SyncStepResult {
  syncedCount: number;
  error?: string;
}

export async function syncPendingShifts(): Promise<SyncStepResult> {
  const pendingShifts = await db.shifts.where("sync_status").equals("pending").toArray();
  if (pendingShifts.length === 0) return { syncedCount: 0 };

  const payloads: ShiftPayload[] = pendingShifts.map((shift) => ({
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

  let result: Awaited<ReturnType<typeof syncShiftsToCloud>>;
  try {
    result = await syncShiftsToCloud(payloads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    return { syncedCount: 0, error: `Shifts sync error: ${message}` };
  }
  if (!result.success) {
    const error = `Shifts sync error: ${result.error || "Unknown server error"}`;
    console.error("SYNC FAILED:", error);
    return { syncedCount: 0, error };
  }

  const shiftIds = pendingShifts
    .map((shift) => shift.id)
    .filter((id): id is number => id !== undefined);
  if (shiftIds.length > 0) {
    await db.shifts.where("id").anyOf(shiftIds).modify({ sync_status: "synced" });
  }
  return { syncedCount: result.insertedCount ?? pendingShifts.length };
}

export async function syncPendingSales(): Promise<SyncStepResult> {
  const pendingSales = await db.pendingSales.where("sync_status").equals("pending").toArray();
  if (pendingSales.length === 0) return { syncedCount: 0 };

  const payloads: TransactionPayload[] = pendingSales.map((sale) => {
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
  });

  let result: Awaited<ReturnType<typeof syncTransactionsToCloud>>;
  try {
    result = await syncTransactionsToCloud(payloads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    return { syncedCount: 0, error: `Sales sync error: ${message}` };
  }
  if (!result.success) {
    const error = `Sales sync error: ${result.error || "Unknown server error"}`;
    console.error("SYNC FAILED:", error);
    return { syncedCount: 0, error };
  }

  const salesIds = pendingSales
    .map((sale) => sale.id)
    .filter((id): id is number => id !== undefined);
  if (salesIds.length > 0) {
    await db.pendingSales.where("id").anyOf(salesIds).modify({ sync_status: "synced" });
  }
  return { syncedCount: result.insertedCount ?? pendingSales.length };
}

export async function syncPendingExpenses(): Promise<SyncStepResult> {
  const pendingExpenses = await db.pendingExpenses.where("sync_status").equals("pending").toArray();
  if (pendingExpenses.length === 0) return { syncedCount: 0 };

  const payloads: ExpensePayload[] = pendingExpenses.map((expense) => ({
    shift_id: expense.shift_id,
    amount: expense.amount,
    category: expense.category,
    description: expense.description,
    created_at: expense.created_at,
  }));

  let result: Awaited<ReturnType<typeof syncExpensesToCloud>>;
  try {
    result = await syncExpensesToCloud(payloads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    return { syncedCount: 0, error: `Expenses sync error: ${message}` };
  }
  if (!result.success) {
    const error = `Expenses sync error: ${result.error || "Unknown server error"}`;
    console.error("SYNC FAILED:", error);
    return { syncedCount: 0, error };
  }

  const expenseIds = pendingExpenses
    .map((expense) => expense.id)
    .filter((id): id is number => id !== undefined);
  if (expenseIds.length > 0) {
    await db.pendingExpenses.where("id").anyOf(expenseIds).modify({ sync_status: "synced" });
  }
  return { syncedCount: result.insertedCount ?? pendingExpenses.length };
}

export async function syncPendingLedger(): Promise<SyncStepResult> {
  const pendingLedger = await db.pendingLedgerTransactions
    .where("sync_status")
    .equals("pending")
    .toArray();
  if (pendingLedger.length === 0) return { syncedCount: 0 };

  const payloads: LedgerPayload[] = await Promise.all(pendingLedger.map(async (transaction) => {
    const price = transaction.price_per_liter ?? transaction.applied_sp ?? 0;
    const cloudId = transaction.cloud_id || crypto.randomUUID();
    if (transaction.cloud_id !== cloudId && transaction.id !== undefined) {
      await db.pendingLedgerTransactions.update(transaction.id, { cloud_id: cloudId });
    }
    return {
      id: cloudId,
      customer_id: transaction.customer_id,
      customer_name: transaction.customer_name,
      phone_number: transaction.phone_number,
      worker_id: transaction.worker_id,
      issued_by_worker: transaction.issued_by_worker,
      received_by_worker: transaction.received_by_worker,
      liters: transaction.liters,
      amount: transaction.amount,
      price_per_liter: price,
      applied_sp: price,
      transaction_type: transaction.transaction_type,
      status: transaction.status,
      created_at: transaction.created_at,
    };
  }));

  let result: Awaited<ReturnType<typeof syncLedgerToCloud>>;
  try {
    result = await syncLedgerToCloud(payloads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    return { syncedCount: 0, error: `Ledger sync error: ${message}` };
  }
  if (!result.success) {
    const error = `Ledger sync error: ${result.error || "Unknown server error"}`;
    console.error("SYNC FAILED:", error);
    return { syncedCount: 0, error };
  }

  const ledgerIds = pendingLedger
    .map((transaction) => transaction.id)
    .filter((id): id is number => id !== undefined);
  if (ledgerIds.length > 0) {
    await db.pendingLedgerTransactions
      .where("id")
      .anyOf(ledgerIds)
      .modify({ sync_status: "synced" });
  }
  return { syncedCount: result.insertedCount ?? pendingLedger.length };
}

export async function syncPendingInventory(): Promise<SyncStepResult> {
  const pendingInventory = await db.pendingInventory
    .where("sync_status")
    .equals("pending")
    .toArray();
  if (pendingInventory.length === 0) return { syncedCount: 0 };

  const payloads: InventoryPayload[] = pendingInventory.map((item) => ({
    product_id: item.product_id,
    billed_liters: item.billed_liters,
    actual_received_liters: item.actual_received_liters,
    cost_per_liter: item.cost_per_liter,
    created_at: item.created_at,
  }));

  let result: Awaited<ReturnType<typeof syncInventoryToCloud>>;
  try {
    result = await syncInventoryToCloud(payloads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    return { syncedCount: 0, error: `Inventory sync error: ${message}` };
  }
  if (!result.success) {
    const error = `Inventory sync error: ${result.error || "Unknown server error"}`;
    console.error("SYNC FAILED:", error);
    return { syncedCount: 0, error };
  }

  const inventoryIds = pendingInventory
    .map((item) => item.id)
    .filter((id): id is number => id !== undefined);
  if (inventoryIds.length > 0) {
    await db.pendingInventory
      .where("id")
      .anyOf(inventoryIds)
      .modify({ sync_status: "synced" });
  }
  return { syncedCount: result.insertedCount ?? pendingInventory.length };
}