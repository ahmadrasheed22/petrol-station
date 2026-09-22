import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "pending" | "synced" | "failed";

export interface PendingSale {
  id?: number;
  shift_id?: string;
  product_id: string;
  opening_meter?: number;
  closing_meter?: number;
  total_liters: number;
  applied_sp: number;
  applied_cp?: number;
  sync_status: SyncStatus;
  created_at: string;
}

export interface ShiftRecord {
  id?: number;
  shift_id: string;
  user_id: string;
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
  name: string;
  vehicle_number?: string | null;
  total_balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface PendingLedgerTransaction {
  id?: number;
  customer_id: string;
  worker_id?: string;
  liters?: number;
  amount: number;
  applied_sp?: number;
  transaction_type: "credit" | "payment";
  sync_status: SyncStatus;
  created_at: string;
}

export type PendingLedger = PendingLedgerTransaction;

export class PetrolPumpDB extends Dexie {
  pendingSales!: EntityTable<PendingSale, "id">;
  pendingExpenses!: EntityTable<PendingExpense, "id">;
  pendingLedger!: EntityTable<PendingLedger, "id">;
  pendingLedgerTransactions!: EntityTable<PendingLedgerTransaction, "id">;
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
  }
}

export const db = new PetrolPumpDB();

