import { db, type CustomerRecord } from "@/lib/offline-db";
import { triggerAutoSyncIfOnline } from "@/lib/services/sync-service";

export const DEFAULT_CUSTOMERS: CustomerRecord[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    client_id: "11111111-1111-4111-8111-111111111111",
    name: "Malik Goods Transport",
    phone_number: "",
    total_balance: 15400,
    sync_status: "synced",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    client_id: "22222222-2222-4222-8222-222222222222",
    name: "Al-Madina Bus Service",
    phone_number: "",
    total_balance: 42000,
    sync_status: "synced",
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    client_id: "33333333-3333-4333-8333-333333333333",
    name: "Chaudhry Logistics",
    phone_number: "",
    total_balance: 8500,
    sync_status: "synced",
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    client_id: "44444444-4444-4444-8444-444444444444",
    name: "Haji Aslam & Sons",
    phone_number: "",
    total_balance: 0,
    sync_status: "synced",
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

export async function reconcileOfflineCustomersWithCloud(
  cloudCustomers: Array<{ id: string; total_balance: number }>,
  cloudLedgerEntries: Array<{
    id: string;
    client_id: string | null;
    customer_id: string;
    status: "UNPAID" | "PENDING_APPROVAL" | "SETTLED";
  }> = []
): Promise<void> {
  const cloudCustomerBalances = new Map(cloudCustomers.map((customer) => [customer.id, customer.total_balance]));
  const settledCloudIds = new Set(cloudLedgerEntries.filter((entry) => entry.status === "SETTLED").map((entry) => entry.id));
  const settledCloudClientIds = new Set(
    cloudLedgerEntries
      .filter((entry) => entry.status === "SETTLED" && entry.client_id)
      .map((entry) => entry.client_id)
  );
  const localTransactions = await db.pendingLedgerTransactions.toArray();
  const settledTransactions = localTransactions.filter((transaction) =>
    transaction.id !== undefined && (
      (transaction.cloud_id ? settledCloudIds.has(transaction.cloud_id) : false) ||
      settledCloudClientIds.has(transaction.client_id)
    )
  );
  const transactionIdsToDelete = settledTransactions.map((transaction) => transaction.id as number);
  const localCustomers = await db.customers.toArray();
  const customerIdsToDelete = localCustomers
    .filter((customer) => customer.sync_status === "synced" && (cloudCustomerBalances.get(customer.id) ?? 0) <= 0)
    .map((customer) => customer.id);

  await db.transaction("rw", db.pendingLedgerTransactions, db.customers, db.outbox, async () => {
    if (transactionIdsToDelete.length > 0) {
      await db.pendingLedgerTransactions.bulkDelete(transactionIdsToDelete);
      for (const transaction of settledTransactions) {
        if (transaction.customer_id) {
          const customer = await db.customers.get(transaction.customer_id);
          if (customer) {
            const delta = transaction.transaction_type === "credit" ? -transaction.amount : transaction.amount;
            await db.customers.update(transaction.customer_id, {
              total_balance: (customer.total_balance || 0) + delta,
              updated_at: new Date().toISOString(),
            });
          }
        }
        await db.outbox.where("entryId").equals(transaction.id as number).delete();
      }
    }
    if (customerIdsToDelete.length > 0) {
      await db.customers.bulkDelete(customerIdsToDelete);
    }
  });
}

export async function addPendingLedgerTx(txData: {
  customer_id?: string;
  customer_name: string;
  phone_number?: string | null;
  worker_id?: string;
  issued_by_worker?: string;
  received_by_worker?: string;
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
  const phoneNumber = txData.phone_number?.trim() || "";

  let customerId = txData.customer_id;
  if (!customerId) {
    const existingCust = await db.customers
      .filter((customer) =>
        phoneNumber
          ? customer.phone_number === phoneNumber
          : customer.name.toLowerCase() === rawCustomerName.toLowerCase()
      )
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
        client_id: crypto.randomUUID(),
        name: rawCustomerName,
        phone_number: phoneNumber,
        total_balance: 0,
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      });
    }
  }

  const clientId = crypto.randomUUID();
  const entryPayload = {
    client_id: clientId,
    customer_id: customerId,
    customer_name: rawCustomerName,
    phone_number: phoneNumber,
    worker_id: txData.worker_id,
    issued_by_worker:
      txData.issued_by_worker ?? txData.worker_id ?? (txType === "credit" ? txData.worker_id : undefined),
    received_by_worker:
      txData.received_by_worker ?? txData.worker_id ?? (txType === "payment" ? txData.worker_id : undefined),
    liters: txData.liters,
    amount: txData.amount,
    price_per_liter: price,
    applied_sp: price,
    transaction_type: txType,
    status: txType === "credit" ? "UNPAID" : "PENDING_APPROVAL",
    created_at: now,
  } as const;

  const id = await db.pendingLedgerTransactions.add({
    cloud_id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : undefined,
    ...entryPayload,
    sync_status: "pending",
  });

  await db.outbox.add({
    opId: crypto.randomUUID(),
    entryId: id as number,
    type: "CREATE_ENTRY",
    payload: entryPayload,
    createdAt: now,
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

export async function markReceivedLocally(entryId: number): Promise<boolean> {
  let updated = false;

  await db.transaction("rw", db.pendingLedgerTransactions, db.outbox, async () => {
    const entry = await db.pendingLedgerTransactions.get(entryId);
    // Only an unpaid local entry can enter the worker approval flow.
    if (!entry || entry.status !== "UNPAID") return;

    const receivedAt = new Date().toISOString();
    await db.pendingLedgerTransactions.update(entryId, {
      status: "PENDING_APPROVAL",
      received_at: receivedAt,
      updated_at: receivedAt,
      sync_status: "pending",
    });

    const createJob = await db.outbox
      .where("entryId")
      .equals(entryId)
      .and((job) => job.type === "CREATE_ENTRY")
      .first();

    if (createJob) {
      await db.outbox.update(createJob.opId, {
        payload: {
          ...createJob.payload,
          client_id: entry.client_id,
          status: "PENDING_APPROVAL",
          received_at: receivedAt,
        },
      });
    } else {
      await db.outbox.add({
        opId: crypto.randomUUID(),
        entryId,
        type: "MARK_RECEIVED",
        payload: {
          client_id: entry.client_id,
          status: "PENDING_APPROVAL",
          received_at: receivedAt,
        },
        createdAt: receivedAt,
      });
    }

    updated = true;
  });

  if (updated) triggerAutoSyncIfOnline();
  return updated;
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
              client_id: crypto.randomUUID(),
              name: trimmedName,
              phone_number: oldTx.phone_number,
              total_balance: oldTx.transaction_type === "credit" ? data.amount : -data.amount,
              sync_status: "pending",
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