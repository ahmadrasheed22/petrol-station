import { db, type CustomerRecord } from "@/lib/offline-db";
import { triggerAutoSyncIfOnline } from "@/lib/services/sync-service";

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

export async function addPendingLedgerTx(txData: {
  customer_id?: string;
  customer_name: string;
  worker_id?: string;
  liters?: number;
  amount: number;
  price_per_liter?: number;
  applied_sp?: number;
  transaction_type?: "credit" | "payment";
}): Promise<number> {
  const now = new Date().toISOString();
  const txType = txData.transaction_type ?? "credit";
  const price = txData.price_per_liter ?? txData.applied_sp ?? 0;
  const rawCustomerName = txData.customer_name?.trim() || "Walk-in Customer";

  let customerId = txData.customer_id;
  if (!customerId) {
    const existingCust = await db.customers
      .filter((customer) => customer.name.toLowerCase() === rawCustomerName.toLowerCase())
      .first();

    if (existingCust) {
      customerId = existingCust.id;
    } else {
      customerId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      await db.customers.add({
        id: customerId,
        name: rawCustomerName,
        total_balance: 0,
        created_at: now,
        updated_at: now,
      });
    }
  }

  const id = await db.pendingLedgerTransactions.add({
    customer_id: customerId,
    customer_name: rawCustomerName,
    worker_id: txData.worker_id,
    liters: txData.liters,
    amount: txData.amount,
    price_per_liter: price,
    applied_sp: price,
    transaction_type: txType,
    sync_status: "pending",
    created_at: now,
  });

  if (customerId) {
    try {
      const customer = await db.customers.get(customerId);
      if (customer) {
        const balanceDelta = txType === "credit" ? txData.amount : -txData.amount;
        const updatedBalance = (customer.total_balance || 0) + balanceDelta;
        await db.customers.update(customerId, {
          total_balance: updatedBalance,
          updated_at: now,
        });
      }
    } catch (customerError) {
      console.warn("Could not update local customer balance in Dexie:", customerError);
    }
  }

  triggerAutoSyncIfOnline();
  return id as number;
}

export async function deletePendingLedgerTx(id: number): Promise<void> {
  const tx = await db.pendingLedgerTransactions.get(id);
  if (tx) {
    if (tx.customer_id) {
      try {
        const customer = await db.customers.get(tx.customer_id);
        if (customer) {
          const delta = tx.transaction_type === "credit" ? -tx.amount : tx.amount;
          const updatedBalance = (customer.total_balance || 0) + delta;
          await db.customers.update(tx.customer_id, {
            total_balance: updatedBalance,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (customerError) {
        console.warn("Could not revert local customer balance in Dexie:", customerError);
      }
    }
    await db.pendingLedgerTransactions.delete(id);
  }
}

export async function updatePendingLedgerTx(
  id: number,
  data: {
    customer_name: string;
    liters: number;
    price_per_liter: number;
    amount: number;
  }
): Promise<void> {
  const oldTx = await db.pendingLedgerTransactions.get(id);
  if (!oldTx) return;

  const now = new Date().toISOString();
  const trimmedName = data.customer_name.trim();
  let targetCustomerId = oldTx.customer_id;

  if (targetCustomerId) {
    try {
      const oldCustomer = await db.customers.get(targetCustomerId);
      if (oldCustomer) {
        if (oldCustomer.name.toLowerCase() === trimmedName.toLowerCase()) {
          const amountDiff = data.amount - oldTx.amount;
          const delta = oldTx.transaction_type === "credit" ? amountDiff : -amountDiff;
          await db.customers.update(targetCustomerId, {
            total_balance: (oldCustomer.total_balance || 0) + delta,
            updated_at: now,
          });
        } else {
          const revertDelta = oldTx.transaction_type === "credit" ? -oldTx.amount : oldTx.amount;
          await db.customers.update(targetCustomerId, {
            total_balance: (oldCustomer.total_balance || 0) + revertDelta,
            updated_at: now,
          });

          const existingNew = await db.customers
            .filter((customer) => customer.name.toLowerCase() === trimmedName.toLowerCase())
            .first();

          if (existingNew) {
            targetCustomerId = existingNew.id;
            const newDelta = oldTx.transaction_type === "credit" ? data.amount : -data.amount;
            await db.customers.update(targetCustomerId, {
              total_balance: (existingNew.total_balance || 0) + newDelta,
              updated_at: now,
            });
          } else {
            const newCustomerId =
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            await db.customers.add({
              id: newCustomerId,
              name: trimmedName,
              total_balance: oldTx.transaction_type === "credit" ? data.amount : -data.amount,
              created_at: now,
              updated_at: now,
            });
            targetCustomerId = newCustomerId;
          }
        }
      }
    } catch (customerError) {
      console.warn("Could not recalibrate customer balance on edit:", customerError);
    }
  }

  await db.pendingLedgerTransactions.update(id, {
    customer_id: targetCustomerId,
    customer_name: trimmedName,
    liters: data.liters,
    price_per_liter: data.price_per_liter,
    applied_sp: data.price_per_liter,
    amount: data.amount,
  });
}