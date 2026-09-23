import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "pending" | "synced" | "failed";

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
  start_time: string;
  end_time?: string;
  status: "active" | "ended";
  opening_meter?: number;
  closing_meter?: number;
  testing_liters?: number;
  expected_cash?: number;
  actual_cash?: number;
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
  name: string;
  vehicle_number?: string | null;
  total_balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface PendingLedgerTransaction {
  id?: number;
  customer_id?: string;
  customer_name: string; // Raw text customer name saved directly
  worker_id?: string;
  liters?: number;
  amount: number;
  price_per_liter?: number; // Manual price input
  applied_sp?: number;
  transaction_type: "credit" | "payment";
  sync_status: SyncStatus;
  created_at: string;
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
  }
}

export const db = new PetrolPumpDB();
