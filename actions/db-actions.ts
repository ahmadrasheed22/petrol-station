"use server";

import { createClient } from "@/lib/supabase/server";

export interface TransactionPayload {
  shift_id?: string;
  product_id?: string;
  type?: string;
  liters?: number;
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

export interface SyncResult {
  success: boolean;
  insertedCount?: number;
  error?: string;
}

/**
 * Bulk insert pending sales transactions into Supabase 'transactions' table.
 */
export async function syncTransactionsToCloud(
  transactions: TransactionPayload[]
): Promise<SyncResult> {
  if (!transactions || transactions.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();

    const formattedTransactions = transactions.map((t) => ({
      shift_id: t.shift_id || null,
      product_id: t.product_id || null,
      type: t.type || "sale",
      liters: t.liters ?? 0,
      applied_sp: t.applied_sp ?? 0,
      applied_cp: t.applied_cp ?? 0,
      total_amount: t.total_amount ?? (t.liters ?? 0) * (t.applied_sp ?? 0),
      created_at: t.created_at || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("transactions")
      .insert(formattedTransactions)
      .select("id");

    if (error) {
      console.error("Supabase insert transactions error:", error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      insertedCount: data ? data.length : transactions.length,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to sync transactions to cloud.";
    console.error("syncTransactionsToCloud exception:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Bulk insert pending expenses into Supabase 'expenses' table.
 */
export async function syncExpensesToCloud(
  expenses: ExpensePayload[]
): Promise<SyncResult> {
  if (!expenses || expenses.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();

    const formattedExpenses = expenses.map((e) => {
      const descParts = [e.category, e.description].filter(Boolean);
      return {
        shift_id: e.shift_id || null,
        amount: e.amount ?? 0,
        description: descParts.length > 0 ? descParts.join(" - ") : null,
        created_at: e.created_at || new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from("expenses")
      .insert(formattedExpenses)
      .select("id");

    if (error) {
      console.error("Supabase insert expenses error:", error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      insertedCount: data ? data.length : expenses.length,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to sync expenses to cloud.";
    console.error("syncExpensesToCloud exception:", err);
    return { success: false, error: errorMsg };
  }
}
