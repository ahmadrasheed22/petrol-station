import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "draft" | "pending" | "synced" | "failed";
export type LedgerSyncStatus = "pending" | "synced";
export type LedgerStatus = "UNPAID" | "PENDING_APPROVAL" | "SETTLED";
export type OutboxJobType = "CREATE_ENTRY" | "MARK_RECEIVED";

export interface PendingSale {
  id?: number;
  shift_id?: string;
  product_id?: string;
  product_name?: string;
  opening_meter?: number;
  closing_meter?: number;
  total_liters: number;
  price_per_liter?: number; // Manual price input
  applied_sp: number; // Snapshotted price (synced with price_per_liter)
  applied_cp?: number;
  sync_status: SyncStatus;
  created_at: string;
}

export interface ShiftRecord {
  id?: number;
  shift_id: string;
  user_id: string;
  worker_name?: string;
  product_id?: string;
  product_name?: string;
  price_per_liter?: number;
  opening_meter?: number;
  closing_meter?: number;
  testing_liters?: number;
  total_liters?: number;
  expected_cash?: number;
  actual_cash?: number;
  shortage_amount?: number; // negative = shortage, positive = excess, 0 = balanced
  start_time: string;
  end_time?: string;
  status: "active" | "ended";
  sync_status: SyncStatus;
  created_at: string;
}

export interface PendingExpense {
  id?: number;
  shift_id?: string;
  amount: number;
  category: string;
  description?: string;
  sync_status: SyncStatus;
  created_at: string;
}

export interface CustomerRecord {
  id: string;
  client_id: string;
  name: string;
  phone_number: string;
  total_balance: number;
  sync_status: LedgerSyncStatus;
  created_at?: string;
  updated_at?: string;
}

export interface PendingLedgerTransaction {
  id?: number;
  cloud_id?: string;
  client_id: string;
  customer_id?: string;
  customer_name: string; // Raw text customer name saved directly
  phone_number: string;
  worker_id?: string;
  issued_by_worker?: string;
  issued_by_worker_name?: string;
  received_by_worker?: string;
  received_by_worker_name?: string;
  received_at?: string;
  updated_at?: string;
  liters?: number;
  amount: number;
  price_per_liter?: number; // Manual price input
  applied_sp?: number;
  transaction_type: "credit" | "payment";
  status: LedgerStatus;
  sync_status: LedgerSyncStatus;
  created_at: string;
}

export interface LedgerOutboxJob {
  opId: string;
  entryId: number;
  type: OutboxJobType;
  payload: { client_id: string; [key: string]: unknown };
  createdAt: string;
}

export type PendingLedger = PendingLedgerTransaction;

export interface PendingInventory {
  id?: number;
  product_id: string;
  billed_liters: number;
  actual_received_liters: number;
  cost_per_liter: number;
  sync_status: SyncStatus;
  created_at: string;
}

export type pendingInventory = PendingInventory;

export class PetrolPumpDB extends Dexie {
  pendingSales!: EntityTable<PendingSale, "id">;
  pendingExpenses!: EntityTable<PendingExpense, "id">;
  pendingLedger!: EntityTable<PendingLedger, "id">;
  pendingLedgerTransactions!: EntityTable<PendingLedgerTransaction, "id">;
  pendingInventory!: EntityTable<PendingInventory, "id">;
  shifts!: EntityTable<ShiftRecord, "id">;
  customers!: EntityTable<CustomerRecord, "id">;
  outbox!: EntityTable<LedgerOutboxJob, "opId">;

  constructor() {
    super("PetrolPumpDB");
    this.version(1).stores({
      pendingSales: "++id, sync_status, shift_id, product_id, created_at",
      pendingExpenses: "++id, sync_status, shift_id, category, created_at",
      pendingLedger: "++id, sync_status, customer_id, transaction_type, created_at",
    });

    this.version(2).stores({
      pendingSales: "++id, sync_status, shift_id, product_id, created_at",
      pendingExpenses: "++id, sync_status, shift_id, category, created_at",
      pendingLedger: "++id, sync_status, customer_id, transaction_type, created_at",
      shifts: "++id, shift_id, user_id, status, sync_status, created_at",
    });

    this.version(3).stores({
      pendingSales: "++id, sync_status, shift_id, product_id, created_at",
      pendingExpenses: "++id, sync_status, shift_id, category, amount, description, created_at",
      pendingLedger: "++id, sync_status, customer_id, transaction_type, created_at",
      shifts: "++id, shift_id, user_id, status, sync_status, created_at",
    });

    this.version(4).stores({
      pendingSales: "++id, sync_status, shift_id, product_id, created_at",
      pendingExpenses: "++id, sync_status, shift_id, category, amount, description, created_at",
      pendingLedger: "++id, sync_status, customer_id, transaction_type, created_at",
      pendingLedgerTransactions: "++id, sync_status, customer_id, transaction_type, created_at",
      shifts: "++id, shift_id, user_id, status, sync_status, created_at",
      customers: "id, name, vehicle_number, total_balance",
    });

    this.version(5).stores({
      pendingSales: "++id, sync_status, shift_id, product_id, created_at",
      pendingExpenses: "++id, sync_status, shift_id, category, amount, description, created_at",
      pendingLedger: "++id, sync_status, customer_id, transaction_type, created_at",
      pendingLedgerTransactions: "++id, sync_status, customer_id, transaction_type, created_at",
      shifts: "++id, shift_id, user_id, status, sync_status, created_at",
      customers: "id, name, vehicle_number, total_balance",
      pendingInventory: "++id, sync_status, product_id, created_at",
    });

    // Version 6: Manual Meter-Reading & Raw Customer Name flow
    this.version(6).stores({
      pendingSales: "++id, sync_status, shift_id, product_id, created_at",
      pendingExpenses: "++id, sync_status, shift_id, category, amount, description, created_at",
      pendingLedger: "++id, sync_status, customer_id, customer_name, transaction_type, created_at",
      pendingLedgerTransactions: "++id, sync_status, customer_id, customer_name, transaction_type, created_at",
      shifts: "++id, shift_id, user_id, status, sync_status, created_at",
      customers: "id, name, vehicle_number, total_balance",
      pendingInventory: "++id, sync_status, product_id, created_at",
    });

    // Version 7: Shift Duty Meter-Reading with product and shortage indexing
    this.version(7).stores({
      pendingSales: "++id, sync_status, shift_id, product_id, created_at",
      pendingExpenses: "++id, sync_status, shift_id, category, amount, description, created_at",
      pendingLedger: "++id, sync_status, customer_id, customer_name, transaction_type, created_at",
      pendingLedgerTransactions: "++id, sync_status, customer_id, customer_name, transaction_type, created_at",
      shifts: "++id, shift_id, user_id, product_id, status, sync_status, created_at",
      customers: "id, name, vehicle_number, total_balance",
      pendingInventory: "++id, sync_status, product_id, created_at",
    });

    this.version(8)
      .stores({
        pendingSales: "++id, sync_status, shift_id, product_id, created_at",
        pendingExpenses: "++id, sync_status, shift_id, category, amount, description, created_at",
        pendingLedger: "++id, sync_status, customer_id, customer_name, transaction_type, created_at",
        pendingLedgerTransactions: "++id, sync_status, customer_id, customer_name, transaction_type, created_at",
        shifts: "++id, shift_id, user_id, product_id, status, sync_status, created_at",
        customers: "id, name, phone_number, total_balance",
        pendingInventory: "++id, sync_status, product_id, created_at",
      })
      .upgrade(async (transaction) => {
        await transaction.table("customers").toCollection().modify((customer) => {
          const legacyCustomer = customer as CustomerRecord & {
            vehicle_number?: string | null;
          };
          legacyCustomer.phone_number ??= "";
          delete legacyCustomer.vehicle_number;
        });

        const normalizeLedger = (record: PendingLedgerTransaction) => {
          record.phone_number ??= "";
          record.issued_by_worker ??=
            record.transaction_type === "credit" ? record.worker_id : undefined;
          record.received_by_worker ??=
            record.transaction_type === "payment" ? record.worker_id : undefined;
          record.status ??=
            record.transaction_type === "payment" ? "PENDING_APPROVAL" : "UNPAID";
        };
        await transaction
          .table("pendingLedgerTransactions")
          .toCollection()
          .modify(normalizeLedger);
        await transaction.table("pendingLedger").toCollection().modify(normalizeLedger);
      });

    // Version 9: Separate synced local ledger state from unsynced work.
    this.version(9)
      .stores({
        pendingSales: "++id, sync_status, shift_id, product_id, created_at",
        pendingExpenses: "++id, sync_status, shift_id, category, amount, description, created_at",
        pendingLedger: "++id, sync_status, customer_id, customer_name, transaction_type, created_at",
        pendingLedgerTransactions: "++id, sync_status, customer_id, customer_name, transaction_type, created_at",
        shifts: "++id, shift_id, user_id, product_id, status, sync_status, created_at",
        customers: "id, name, phone_number, total_balance, sync_status",
        pendingInventory: "++id, sync_status, product_id, created_at",
        outbox: "opId, entryId, type, createdAt",
      })
      .upgrade(async (transaction) => {
        await transaction.table("customers").toCollection().modify((customer) => {
          (customer as CustomerRecord).sync_status = "synced";
        });
        await transaction.table("pendingLedgerTransactions").toCollection().modify((entry) => {
          (entry as PendingLedgerTransaction).sync_status = "synced";
        });
        await transaction.table("pendingLedger").toCollection().modify((entry) => {
          (entry as PendingLedgerTransaction).sync_status = "synced";
        });
      });

    // Version 10: Stable client identity for cloud idempotency.
    this.version(10)
      .stores({
        pendingSales: "++id, sync_status, shift_id, product_id, created_at",
        pendingExpenses: "++id, sync_status, shift_id, category, amount, description, created_at",
        pendingLedger: "++id, sync_status, customer_id, client_id, customer_name, transaction_type, created_at",
        pendingLedgerTransactions: "++id, sync_status, customer_id, client_id, customer_name, transaction_type, created_at",
        shifts: "++id, shift_id, user_id, product_id, status, sync_status, created_at",
        customers: "id, client_id, name, phone_number, total_balance, sync_status",
        pendingInventory: "++id, sync_status, product_id, created_at",
        outbox: "opId, entryId, type, createdAt",
      })
      .upgrade(async (transaction) => {
        const createClientId = () => {
          if (typeof crypto === "undefined" || !crypto.randomUUID) {
            throw new Error("crypto.randomUUID is required to migrate local ledger identities.");
          }
          return crypto.randomUUID();
        };

        await transaction.table("customers").toCollection().modify((customer) => {
          const record = customer as CustomerRecord;
          record.client_id ??= createClientId();
        });
        await transaction.table("pendingLedgerTransactions").toCollection().modify((entry) => {
          const record = entry as PendingLedgerTransaction;
          record.client_id ??= createClientId();
        });
        await transaction.table("pendingLedger").toCollection().modify((entry) => {
          const record = entry as PendingLedgerTransaction;
          record.client_id ??= createClientId();
        });
      });
  }
}

export const db = new PetrolPumpDB();

db.on("versionchange", () => {
  db.close();
  if (typeof window !== "undefined") {
    console.warn("A newer PetrolPumpDB version is available. Reloading this tab.");
    window.setTimeout(() => window.location.reload(), 0);
  }
});
