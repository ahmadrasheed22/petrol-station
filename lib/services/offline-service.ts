import {
  db,
  type ShiftRecord,
  type PendingSale,
  type PendingInventory,
} from "@/lib/offline-db";
import { triggerAutoSyncIfOnline } from "@/lib/services/sync-service";
export {
  DEFAULT_CUSTOMERS,
  addPendingLedgerTx,
  deletePendingLedgerTx,
  getOfflineCustomers,
  markReceivedLocally,
  updatePendingLedgerTx,
} from "@/lib/services/offline-ledger-service";

/**
 * Service functions for offline IndexedDB operations (Dexie.js).
 * Keeps database interaction separate from UI components.
 */

export function fetchPendingSales(): Promise<PendingSale[]> {
  return db.pendingSales.toArray();
}

export async function getActiveShift(): Promise<ShiftRecord | undefined> {
  return await db.shifts.where("status").equals("active").first();
}

export async function startShift(
  userId: string,
  options?: {
    worker_name?: string;
    product_id?: string;
    product_name?: string;
    price_per_liter?: number;
    opening_meter?: number;
    deferSync?: boolean;
  }
): Promise<ShiftRecord> {
  const now = new Date().toISOString();
  const shiftId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;

  // Automatically mark any existing active shift as ended
  const existingActive = await db.shifts
    .where("status")
    .equals("active")
    .toArray();
  for (const shift of existingActive) {
    if (shift.id) {
      await db.shifts.update(shift.id, { status: "ended", end_time: now });
    }
  }

  const shiftData: Omit<ShiftRecord, "id"> = {
    shift_id: shiftId,
    user_id: userId,
    worker_name: options?.worker_name,
    product_id: options?.product_id,
    product_name: options?.product_name,
    price_per_liter: options?.price_per_liter ?? 0,
    opening_meter: options?.opening_meter ?? 0,
    closing_meter: 0,
    testing_liters: 0,
    total_liters: 0,
    expected_cash: 0,
    actual_cash: 0,
    shortage_amount: 0,
    start_time: now,
    status: "active",
    sync_status: options?.deferSync ? "draft" : "pending",
    created_at: now,
  };

  const id = await db.shifts.add(shiftData as ShiftRecord);
  if (!options?.deferSync) triggerAutoSyncIfOnline();
  return { id: id as number, ...shiftData };
}

export async function saveShiftProgress(
  id: number,
  options?: {
    closing_meter?: number;
    testing_liters?: number;
    total_liters?: number;
    expected_cash?: number;
    actual_cash?: number;
    shortage_amount?: number;
  }
): Promise<void> {
  await db.shifts.update(id, {
    ...(options?.closing_meter !== undefined && {
      closing_meter: options.closing_meter,
    }),
    ...(options?.testing_liters !== undefined && {
      testing_liters: options.testing_liters,
    }),
    ...(options?.total_liters !== undefined && {
      total_liters: options.total_liters,
    }),
    ...(options?.expected_cash !== undefined && {
      expected_cash: options.expected_cash,
    }),
    ...(options?.actual_cash !== undefined && {
      actual_cash: options.actual_cash,
    }),
    ...(options?.shortage_amount !== undefined && {
      shortage_amount: options.shortage_amount,
    }),
    status: "active",
    sync_status: "pending",
  });
}

export async function endShift(
  id: number,
  options?: {
    closing_meter?: number;
    testing_liters?: number;
    total_liters?: number;
    expected_cash?: number;
    actual_cash?: number;
    shortage_amount?: number;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db.shifts.update(id, {
    status: "ended",
    end_time: now,
    ...(options?.closing_meter !== undefined && {
      closing_meter: options.closing_meter,
    }),
    ...(options?.testing_liters !== undefined && {
      testing_liters: options.testing_liters,
    }),
    ...(options?.total_liters !== undefined && {
      total_liters: options.total_liters,
    }),
    ...(options?.expected_cash !== undefined && {
      expected_cash: options.expected_cash,
    }),
    ...(options?.actual_cash !== undefined && {
      actual_cash: options.actual_cash,
    }),
    ...(options?.shortage_amount !== undefined && {
      shortage_amount: options.shortage_amount,
    }),
    sync_status: "pending",
  });
  triggerAutoSyncIfOnline();
}

export async function fetchRecentShifts(limit = 10): Promise<ShiftRecord[]> {
  try {
    return await db.shifts
      .orderBy("created_at")
      .reverse()
      .limit(limit)
      .toArray();
  } catch (err) {
    console.error("Failed to query recent shifts from Dexie:", err);
    return [];
  }
}

export async function addPendingSale(saleData: {
  shift_id?: string;
  product_id?: string;
  product_name?: string;
  total_liters: number;
  price_per_liter?: number;
  applied_sp?: number;
  applied_cp?: number;
  opening_meter?: number;
  closing_meter?: number;
}): Promise<number> {
  const now = new Date().toISOString();
  const price = saleData.price_per_liter ?? saleData.applied_sp ?? 0;
  const id = await db.pendingSales.add({
    shift_id: saleData.shift_id,
    product_id: saleData.product_id || "manual",
    product_name: saleData.product_name,
    opening_meter: saleData.opening_meter,
    closing_meter: saleData.closing_meter,
    total_liters: saleData.total_liters,
    price_per_liter: price,
    applied_sp: price,
    applied_cp: saleData.applied_cp ?? price,
    sync_status: "draft",
    created_at: now,
  });
  return id as number;
}

export async function addDummySale() {
  return await db.pendingSales.add({
    shift_id: "shift_test",
    product_id: "Petrol",
    opening_meter: 1000,
    closing_meter: 1010,
    total_liters: 10,
    applied_sp: 270,
    applied_cp: 260,
    sync_status: "pending",
    created_at: new Date().toISOString(),
  });
}

export async function clearPendingSales() {
  return await db.pendingSales.clear();
}

export async function addPendingExpense(expenseData: {
  shift_id?: string;
  amount: number;
  category: string;
  description?: string;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = await db.pendingExpenses.add({
    shift_id: expenseData.shift_id,
    amount: expenseData.amount,
    category: expenseData.category,
    description: expenseData.description,
    sync_status: "pending",
    created_at: now,
  });
  triggerAutoSyncIfOnline();
  return id as number;
}

export async function updatePendingExpense(
  id: number,
  data: {
    amount: number;
    category: string;
    description?: string;
  }
): Promise<void> {
  await db.pendingExpenses.update(id, {
    amount: data.amount,
    category: data.category,
    description: data.description,
    sync_status: "draft",
  });
}

export async function deletePendingExpense(id: number): Promise<void> {
  await db.pendingExpenses.delete(id);
}

/**
 * Saves a pending fuel tanker arrival (inventory) to Dexie with sync_status: 'pending'.
 */
export async function addPendingInventory(arrivalData: {
  product_id: string;
  billed_liters: number;
  actual_received_liters: number;
  cost_per_liter: number;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = await db.pendingInventory.add({
    product_id: arrivalData.product_id,
    billed_liters: arrivalData.billed_liters,
    actual_received_liters: arrivalData.actual_received_liters,
    cost_per_liter: arrivalData.cost_per_liter,
    sync_status: "pending",
    created_at: now,
  });
  triggerAutoSyncIfOnline();
  return id as number;
}

/**
 * Fetches all pending/synced inventory records from Dexie.
 */
export function fetchPendingInventory(): Promise<PendingInventory[]> {
  return db.pendingInventory.toArray();
}

