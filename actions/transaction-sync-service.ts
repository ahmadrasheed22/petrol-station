import { createClient } from "@/lib/supabase/server";
import type {
  ExpensePayload,
  SyncResult,
  TransactionPayload,
} from "@/actions/db-actions";

export async function syncTransactionsToCloudService(
  transactions: TransactionPayload[]
): Promise<SyncResult> {
  if (!transactions || transactions.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();
    const shiftIds = Array.from(
      new Set(
        transactions
          .map((transaction) => transaction.shift_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let validShiftIds = new Set<string>();
    if (shiftIds.length > 0) {
      const { data: existingShifts } = await supabase
        .from("shifts")
        .select("id")
        .in("id", shiftIds);
      validShiftIds = new Set((existingShifts || []).map((shift) => shift.id));
    }

    const productIds = Array.from(
      new Set(
        transactions
          .map((transaction) => transaction.product_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let validProductIds = new Set<string>();
    if (productIds.length > 0) {
      const { data: existingProducts } = await supabase
        .from("products")
        .select("id")
        .in("id", productIds);
      validProductIds = new Set((existingProducts || []).map((product) => product.id));
    }

    const formattedTransactions = transactions.map((transaction) => {
      const price = transaction.price_per_liter ?? transaction.applied_sp ?? 0;
      const liters = transaction.liters ?? 0;
      return {
        shift_id:
          transaction.shift_id && validShiftIds.has(transaction.shift_id)
            ? transaction.shift_id
            : null,
        product_id:
          transaction.product_id && validProductIds.has(transaction.product_id)
            ? transaction.product_id
            : null,
        type: transaction.type || "sale",
        liters,
        price_per_liter: price,
        applied_sp: price,
        applied_cp: transaction.applied_cp ?? 0,
        total_amount: transaction.total_amount ?? liters * price,
        created_at: transaction.created_at || new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from("transactions")
      .insert(formattedTransactions)
      .select("id");

    if (error) {
      const fullErrorMsg = [error.message, error.details, error.hint]
        .filter(Boolean)
        .join(" | ");
      console.error("Supabase insert transactions error:", fullErrorMsg);
      return { success: false, error: fullErrorMsg };
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

export async function syncExpensesToCloudService(
  expenses: ExpensePayload[]
): Promise<SyncResult> {
  if (!expenses || expenses.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();
    const shiftIds = Array.from(
      new Set(
        expenses
          .map((expense) => expense.shift_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let validShiftIds = new Set<string>();
    if (shiftIds.length > 0) {
      const { data: existingShifts } = await supabase
        .from("shifts")
        .select("id")
        .in("id", shiftIds);
      validShiftIds = new Set((existingShifts || []).map((shift) => shift.id));
    }

    const formattedExpenses = expenses.map((expense) => {
      const descParts = [expense.category, expense.description].filter(Boolean);
      return {
        shift_id:
          expense.shift_id && validShiftIds.has(expense.shift_id)
            ? expense.shift_id
            : null,
        amount: expense.amount ?? 0,
        description: descParts.length > 0 ? descParts.join(" - ") : null,
        created_at: expense.created_at || new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from("expenses")
      .insert(formattedExpenses)
      .select("id");

    if (error) {
      const fullErrorMsg = [error.message, error.details, error.hint]
        .filter(Boolean)
        .join(" | ");
      console.error("Supabase insert expenses error:", fullErrorMsg);
      return { success: false, error: fullErrorMsg };
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