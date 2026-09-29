"use server";

import { createClient } from "@/lib/supabase/server";
import { syncLedgerToCloudService } from "@/actions/ledger-sync-service";
import { syncInventoryToCloudService } from "@/actions/inventory-sync-service";
import {
  syncExpensesToCloudService,
  syncTransactionsToCloudService,
} from "@/actions/transaction-sync-service";

export interface TransactionPayload {
  shift_id?: string;
  product_id?: string;
  type?: string;
  liters?: number;
  price_per_liter?: number;
  applied_sp?: number;
  applied_cp?: number;
  total_amount?: number;
  created_at?: string;
}

export interface ExpensePayload {
  shift_id?: string;
  amount: number;
  category?: string;
  description?: string;
  created_at?: string;
}

export interface ShiftPayload {
  shift_id: string;
  user_id?: string;
  worker_name?: string;
  product_id?: string;
  product_name?: string;
  price_per_liter?: number;
  start_time: string;
  end_time?: string;
  opening_meter?: number;
  closing_meter?: number;
  testing_liters?: number;
  total_liters?: number;
  expected_cash?: number;
  actual_cash?: number;
  shortage_amount?: number;
  created_at?: string;
}

export interface LedgerPayload {
  id?: string;
  customer_id?: string;
  customer_name?: string;
  phone_number?: string;
  worker_id?: string;
  issued_by_worker?: string;
  issued_by_worker_name?: string;
  received_by_worker?: string;
  received_by_worker_name?: string;
  liters?: number;
  amount: number;
  price_per_liter?: number;
  applied_sp?: number;
  transaction_type?: "credit" | "payment";
  status?: "UNPAID" | "PENDING_APPROVAL" | "SETTLED";
  received_at?: string;
  updated_at?: string;
  created_at?: string;
}

export interface InventoryPayload {
  product_id: string;
  billed_liters: number;
  actual_received_liters: number;
  cost_per_liter: number;
  created_at?: string;
}

export interface SyncResult {
  success: boolean;
  insertedCount?: number;
  error?: string;
}


/**
 * Bulk upsert pending shifts into Supabase 'shifts' table.
 */
export async function syncShiftsToCloud(
  shifts: ShiftPayload[]
): Promise<SyncResult> {
  if (!shifts || shifts.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();

    // 1. Extract unique worker user IDs
    const workerIds = Array.from(
      new Set(
        shifts
          .map((s) => s.user_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    // 2. Ensure all referenced worker profiles exist in public.profiles table
    if (workerIds.length > 0) {
      const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("id", workerIds);

      const existingIdSet = new Set((existingProfiles || []).map((p) => p.id));
      const missingIds = workerIds.filter((id) => !existingIdSet.has(id));

      if (missingIds.length > 0) {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        const profilesToCreate = missingIds.map((id) => {
          const isCurrent = currentUser?.id === id;
          const email = isCurrent ? currentUser?.email : undefined;
          const name = email
            ? email.split("@")[0]
            : `Worker ${id.slice(0, 8)}`;
          return {
            id,
            name,
            role: "worker",
            updated_at: new Date().toISOString(),
          };
        });

        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(profilesToCreate, { onConflict: "id" });

        if (profileUpsertError) {
          console.warn(
            "Warning: Could not auto-provision worker profiles:",
            profileUpsertError.message
          );
        }
      }
    }

    // Re-verify valid profile IDs to protect against FK constraint failures
    const { data: verifiedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .in("id", workerIds);
    const verifiedProfileSet = new Set(
      (verifiedProfiles || []).map((p) => p.id)
    );

    const formattedShifts = shifts.map((s) => ({
      id: s.shift_id,
      worker_id:
        s.user_id && verifiedProfileSet.has(s.user_id) ? s.user_id : null,
      product_id: s.product_id || null,
      product_name: s.product_name || null,
      price_per_liter: s.price_per_liter ?? 0,
      start_time: s.start_time || new Date().toISOString(),
      end_time: s.end_time || null,
      opening_meter: s.opening_meter ?? 0,
      closing_meter: s.closing_meter ?? 0,
      testing_liters: s.testing_liters ?? 0,
      total_liters: s.total_liters ?? 0,
      expected_cash: s.expected_cash ?? 0,
      actual_cash: s.actual_cash ?? 0,
      shortage_amount: s.shortage_amount ?? 0,
      created_at: s.created_at || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("shifts")
      .upsert(formattedShifts, { onConflict: "id" })
      .select("id");

    if (error) {
      const fullErrorMsg = [error.message, error.details, error.hint]
        .filter(Boolean)
        .join(" | ");
      console.error("Supabase upsert shifts error:", fullErrorMsg);
      return { success: false, error: fullErrorMsg };
    }

    return {
      success: true,
      insertedCount: data ? data.length : shifts.length,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to sync shifts to cloud.";
    console.error("syncShiftsToCloud exception:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Bulk insert pending sales transactions into Supabase 'transactions' table.
 */
export async function syncTransactionsToCloud(
  transactions: TransactionPayload[]
): Promise<SyncResult> {
  return syncTransactionsToCloudService(transactions);
}

/**
 * Bulk insert pending expenses into Supabase 'expenses' table.
 */
export async function syncExpensesToCloud(
  expenses: ExpensePayload[]
): Promise<SyncResult> {
  return syncExpensesToCloudService(expenses);
}

/**
 * Bulk insert pending ledger transactions (credit/payment) into Supabase 'ledger_transactions' table
 * and synchronize customer balances.
 */
export async function syncLedgerToCloud(
  ledgerEntries: LedgerPayload[]
): Promise<SyncResult> {
  return syncLedgerToCloudService(ledgerEntries);
}

/**
 * Bulk insert pending fuel tanker arrivals into Supabase 'inventory_arrivals' table.
 */
export async function syncInventoryToCloud(
  entries: InventoryPayload[]
): Promise<SyncResult> {
  return syncInventoryToCloudService(entries);
}


