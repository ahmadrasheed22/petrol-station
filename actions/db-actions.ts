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

export interface ShiftPayload {
  shift_id: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  created_at?: string;
}

export interface LedgerPayload {
  customer_id: string;
  worker_id?: string;
  liters?: number;
  amount: number;
  applied_sp?: number;
  transaction_type?: "credit" | "payment";
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
      start_time: s.start_time || new Date().toISOString(),
      end_time: s.end_time || null,
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
  if (!transactions || transactions.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();

    // Verify existing shifts to safeguard foreign key references
    const shiftIds = Array.from(
      new Set(
        transactions
          .map((t) => t.shift_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let validShiftIds = new Set<string>();
    if (shiftIds.length > 0) {
      const { data: existingShifts } = await supabase
        .from("shifts")
        .select("id")
        .in("id", shiftIds);
      validShiftIds = new Set((existingShifts || []).map((s) => s.id));
    }

    // Verify existing products to safeguard foreign key references
    const productIds = Array.from(
      new Set(
        transactions
          .map((t) => t.product_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let validProductIds = new Set<string>();
    if (productIds.length > 0) {
      const { data: existingProducts } = await supabase
        .from("products")
        .select("id")
        .in("id", productIds);
      validProductIds = new Set((existingProducts || []).map((p) => p.id));
    }

    const formattedTransactions = transactions.map((t) => ({
      shift_id:
        t.shift_id && validShiftIds.has(t.shift_id) ? t.shift_id : null,
      product_id:
        t.product_id && validProductIds.has(t.product_id) ? t.product_id : null,
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

    // Verify existing shifts to safeguard foreign key references
    const shiftIds = Array.from(
      new Set(
        expenses
          .map((e) => e.shift_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let validShiftIds = new Set<string>();
    if (shiftIds.length > 0) {
      const { data: existingShifts } = await supabase
        .from("shifts")
        .select("id")
        .in("id", shiftIds);
      validShiftIds = new Set((existingShifts || []).map((s) => s.id));
    }

    const formattedExpenses = expenses.map((e) => {
      const descParts = [e.category, e.description].filter(Boolean);
      return {
        shift_id:
          e.shift_id && validShiftIds.has(e.shift_id) ? e.shift_id : null,
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

const KNOWN_DEFAULT_CUSTOMERS = [
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
 * Bulk insert pending ledger transactions (credit/payment) into Supabase 'ledger_transactions' table
 * and synchronize customer balances.
 */
export async function syncLedgerToCloud(
  ledgerEntries: LedgerPayload[]
): Promise<SyncResult> {
  if (!ledgerEntries || ledgerEntries.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();

    // 1. Verify or auto-provision referenced customers
    const customerIds = Array.from(
      new Set(
        ledgerEntries
          .map((e) => e.customer_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (customerIds.length > 0) {
      const { data: existingCustomers } = await supabase
        .from("customers")
        .select("id")
        .in("id", customerIds);

      const existingCustSet = new Set((existingCustomers || []).map((c) => c.id));
      const missingCustIds = customerIds.filter((id) => !existingCustSet.has(id));

      if (missingCustIds.length > 0) {
        const defaultMap = new Map(KNOWN_DEFAULT_CUSTOMERS.map((c) => [c.id, c]));
        const customersToCreate = missingCustIds.map((id) => {
          const matched = defaultMap.get(id);
          return {
            id,
            name: matched ? matched.name : `Customer ${id.slice(0, 8)}`,
            vehicle_number: matched?.vehicle_number || null,
            total_balance: matched?.total_balance ?? 0,
            updated_at: new Date().toISOString(),
          };
        });

        const { error: custUpsertError } = await supabase
          .from("customers")
          .upsert(customersToCreate, { onConflict: "id" });

        if (custUpsertError) {
          console.warn(
            "Warning: Could not auto-provision customers:",
            custUpsertError.message
          );
        }
      }
    }

    // 2. Verify worker IDs against profiles
    const workerIds = Array.from(
      new Set(
        ledgerEntries
          .map((e) => e.worker_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let validWorkerIds = new Set<string>();
    if (workerIds.length > 0) {
      const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("id", workerIds);
      validWorkerIds = new Set((existingProfiles || []).map((p) => p.id));
    }

    // 3. Format ledger records
    const formattedEntries = ledgerEntries.map((e) => ({
      customer_id: e.customer_id,
      worker_id:
        e.worker_id && validWorkerIds.has(e.worker_id) ? e.worker_id : null,
      liters: e.liters ?? 0,
      amount: e.amount ?? 0,
      applied_sp: e.applied_sp ?? 0,
      transaction_type: e.transaction_type || "credit",
      created_at: e.created_at || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("ledger_transactions")
      .insert(formattedEntries)
      .select("id");

    if (error) {
      const fullErrorMsg = [error.message, error.details, error.hint]
        .filter(Boolean)
        .join(" | ");
      console.error("Supabase insert ledger_transactions error:", fullErrorMsg);
      return { success: false, error: fullErrorMsg };
    }

    // 4. Update customer total balances in Supabase
    const customerDeltas = new Map<string, number>();
    for (const e of ledgerEntries) {
      const delta = (e.transaction_type || "credit") === "credit" ? e.amount : -e.amount;
      customerDeltas.set(
        e.customer_id,
        (customerDeltas.get(e.customer_id) || 0) + delta
      );
    }

    for (const [custId, delta] of customerDeltas.entries()) {
      try {
        const { data: custData } = await supabase
          .from("customers")
          .select("total_balance")
          .eq("id", custId)
          .single();

        if (custData) {
          const currentBal = Number(custData.total_balance) || 0;
          await supabase
            .from("customers")
            .update({
              total_balance: currentBal + delta,
              updated_at: new Date().toISOString(),
            })
            .eq("id", custId);
        }
      } catch (balErr) {
        console.warn(`Could not update balance for customer ${custId}:`, balErr);
      }
    }

    return {
      success: true,
      insertedCount: data ? data.length : ledgerEntries.length,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to sync ledger to cloud.";
    console.error("syncLedgerToCloud exception:", err);
    return { success: false, error: errorMsg };
  }
}

