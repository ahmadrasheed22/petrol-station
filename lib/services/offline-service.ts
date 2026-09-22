import {
  db,
  ShiftRecord,
  PendingSale,
  CustomerRecord,
  PendingLedgerTransaction,
  PendingInventory,
} from "@/lib/offline-db";

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

export async function startShift(userId: string): Promise<ShiftRecord> {
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
    start_time: now,
    status: "active",
    sync_status: "pending",
    created_at: now,
  };

  const id = await db.shifts.add(shiftData as ShiftRecord);
  return { id: id as number, ...shiftData };
}

export async function endShift(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.shifts.update(id, { status: "ended", end_time: now });
}

export async function addPendingSale(saleData: {
  shift_id?: string;
  product_id: string;
  total_liters: number;
  applied_sp: number;
  applied_cp?: number;
  opening_meter?: number;
  closing_meter?: number;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = await db.pendingSales.add({
    shift_id: saleData.shift_id,
    product_id: saleData.product_id,
    opening_meter: saleData.opening_meter,
    closing_meter: saleData.closing_meter,
    total_liters: saleData.total_liters,
    applied_sp: saleData.applied_sp,
    applied_cp: saleData.applied_cp ?? saleData.applied_sp,
    sync_status: "pending",
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
  return id as number;
}

export const DEFAULT_CUSTOMERS: CustomerRecord[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Malik Goods Transport",
    vehicle_number: "LES-4589",
    total_balance: 15400,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Al-Madina Bus Service",
    vehicle_number: "FSD-1122",
    total_balance: 42000,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Chaudhry Logistics",
    vehicle_number: "LHE-7860",
    total_balance: 8500,
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    name: "Haji Aslam & Sons",
    vehicle_number: "KHI-9921",
    total_balance: 0,
  },
];

/**
 * Fetches offline customers from Dexie.
 * Auto-seeds default customers if the offline store is empty.
 */
export async function getOfflineCustomers(): Promise<CustomerRecord[]> {
  try {
    const customers = await db.customers.toArray();
    if (customers.length === 0) {
      await db.customers.bulkPut(DEFAULT_CUSTOMERS);
      return DEFAULT_CUSTOMERS;
    }
    return customers;
  } catch (error) {
    console.error("Failed to query offline customers from Dexie:", error);
    return DEFAULT_CUSTOMERS;
  }
}

/**
 * Saves a pending ledger transaction (e.g. credit sale or payment) to Dexie
 * and optimistically updates the customer's balance offline.
 */
export async function addPendingLedgerTx(txData: {
  customer_id: string;
  worker_id?: string;
  liters?: number;
  amount: number;
  applied_sp?: number;
  transaction_type?: "credit" | "payment";
}): Promise<number> {
  const now = new Date().toISOString();
  const txType = txData.transaction_type ?? "credit";

  // 1. Add pending ledger transaction to Dexie
  const id = await db.pendingLedgerTransactions.add({
    customer_id: txData.customer_id,
    worker_id: txData.worker_id,
    liters: txData.liters,
    amount: txData.amount,
    applied_sp: txData.applied_sp,
    transaction_type: txType,
    sync_status: "pending",
    created_at: now,
  });

  // 2. Optimistically update local customer balance in Dexie
  try {
    const customer = await db.customers.get(txData.customer_id);
    if (customer) {
      const balanceDelta = txType === "credit" ? txData.amount : -txData.amount;
      const updatedBalance = (customer.total_balance || 0) + balanceDelta;
      await db.customers.update(txData.customer_id, {
        total_balance: updatedBalance,
        updated_at: now,
      });
    }
  } catch (custErr) {
    console.warn("Could not update local customer balance in Dexie:", custErr);
  }

  return id as number;
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
  return id as number;
}

/**
 * Fetches all pending/synced inventory records from Dexie.
 */
export function fetchPendingInventory(): Promise<PendingInventory[]> {
  return db.pendingInventory.toArray();
}

