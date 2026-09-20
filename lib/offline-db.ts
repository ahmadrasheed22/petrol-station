import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "pending" | "synced" | "failed";

export interface PendingSale {
  id?: number;
  shift_id?: string;
  product_id: string;
  opening_meter: number;
  closing_meter: number;
  total_liters: number;
  applied_sp: number;
  applied_cp: number;
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

export interface PendingLedger {
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

export class PetrolPumpDB extends Dexie {
  pendingSales!: EntityTable<PendingSale, "id">;
  pendingExpenses!: EntityTable<PendingExpense, "id">;
  pendingLedger!: EntityTable<PendingLedger, "id">;

  constructor() {
    super("PetrolPumpDB");
    this.version(1).stores({
      pendingSales: "++id, sync_status, shift_id, product_id, created_at",
      pendingExpenses: "++id, sync_status, shift_id, category, created_at",
      pendingLedger: "++id, sync_status, customer_id, transaction_type, created_at",
    });
  }
}

export const db = new PetrolPumpDB();
