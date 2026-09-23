"use server";

import { createClient } from "@/lib/supabase/server";

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
  start_time: string;
  end_time?: string;
  opening_meter?: number;
  closing_meter?: number;
  testing_liters?: number;
  expected_cash?: number;
  actual_cash?: number;
  created_at?: string;
}

export interface LedgerPayload {
  customer_id?: string;
  customer_name?: string;
  worker_id?: string;
  liters?: number;
  amount: number;
  price_per_liter?: number;
  applied_sp?: number;
  transaction_type?: "credit" | "payment";
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
      start_time: s.start_time || new Date().toISOString(),
      end_time: s.end_time || null,
      opening_meter: s.opening_meter ?? 0,
      closing_meter: s.closing_meter ?? 0,
      testing_liters: s.testing_liters ?? 0,
      expected_cash: s.expected_cash ?? 0,
      actual_cash: s.actual_cash ?? 0,
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

    const formattedTransactions = transactions.map((t) => {
      const price = t.price_per_liter ?? t.applied_sp ?? 0;
      const liters = t.liters ?? 0;
      return {
        shift_id:
          t.shift_id && validShiftIds.has(t.shift_id) ? t.shift_id : null,
        product_id:
          t.product_id && validProductIds.has(t.product_id) ? t.product_id : null,
        type: t.type || "sale",
        liters,
        price_per_liter: price,
        applied_sp: price,
        applied_cp: t.applied_cp ?? 0,
        total_amount: t.total_amount ?? liters * price,
        created_at: t.created_at || new Date().toISOString(),
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

    // 1. Resolve or auto-provision customers (supports both pre-existing customer IDs and on-the-fly customer names)
    const entryCustomerMap = new Map<LedgerPayload, string | null>();

    // Collect all valid UUIDs provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const providedUuids = Array.from(
      new Set(
        ledgerEntries
          .map((e) => e.customer_id)
          .filter((id): id is string => Boolean(id && uuidRegex.test(id)))
      )
    );

    let existingCustSet = new Set<string>();
    if (providedUuids.length > 0) {
      const { data: existingCusts } = await supabase
        .from("customers")
        .select("id")
        .in("id", providedUuids);
      existingCustSet = new Set((existingCusts || []).map((c) => c.id));
    }

    // Collect names that need resolution
    const namesToResolve = Array.from(
      new Set(
        ledgerEntries
          .filter((e) => !e.customer_id || !existingCustSet.has(e.customer_id))
          .map((e) => e.customer_name?.trim())
          .filter((name): name is string => Boolean(name))
      )
    );

    const nameToIdMap = new Map<string, string>();
    if (namesToResolve.length > 0) {
      const { data: matchedByName } = await supabase
        .from("customers")
        .select("id, name")
        .in("name", namesToResolve);

      (matchedByName || []).forEach((c) => {
        nameToIdMap.set(c.name.toLowerCase(), c.id);
      });

      const missingNames = namesToResolve.filter(
        (n) => !nameToIdMap.has(n.toLowerCase())
      );

      if (missingNames.length > 0) {
        const newCustomers = missingNames.map((name) => ({
          name,
          total_balance: 0,
          updated_at: new Date().toISOString(),
        }));

        const { data: createdCusts, error: createCustErr } = await supabase
          .from("customers")
          .insert(newCustomers)
          .select("id, name");

        if (!createCustErr && createdCusts) {
          createdCusts.forEach((c) => {
            nameToIdMap.set(c.name.toLowerCase(), c.id);
          });
        }
      }
    }

    // Map each entry to resolved customer_id
    for (const e of ledgerEntries) {
      if (e.customer_id && existingCustSet.has(e.customer_id)) {
        entryCustomerMap.set(e, e.customer_id);
      } else if (e.customer_name && nameToIdMap.has(e.customer_name.trim().toLowerCase())) {
        entryCustomerMap.set(e, nameToIdMap.get(e.customer_name.trim().toLowerCase())!);
      } else {
        entryCustomerMap.set(e, null);
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

    // 3. Format ledger records with customer_name and price_per_liter
    const formattedEntries = ledgerEntries.map((e) => {
      const price = e.price_per_liter ?? e.applied_sp ?? 0;
      const resolvedCustId = entryCustomerMap.get(e);
      return {
        customer_id: resolvedCustId,
        customer_name: e.customer_name || null,
        worker_id:
          e.worker_id && validWorkerIds.has(e.worker_id) ? e.worker_id : null,
        liters: e.liters ?? 0,
        amount: e.amount ?? 0,
        price_per_liter: price,
        applied_sp: price,
        transaction_type: e.transaction_type || "credit",
        created_at: e.created_at || new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from("ledger_transactions")
      .insert(formattedEntries)
      .select("id");

    if (error) {
      const isMissingTable =
        error.message?.includes("Could not find the table") ||
        error.message?.includes("schema cache") ||
        error.code === "PGRST205" ||
        error.code === "42P01";

      const fullErrorMsg = isMissingTable
        ? "Supabase table 'public.ledger_transactions' is missing. Please run migrations in your Supabase Dashboard SQL Editor."
        : [error.message, error.details, error.hint].filter(Boolean).join(" | ");

      console.error("Supabase insert ledger_transactions error:", fullErrorMsg);
      return { success: false, error: fullErrorMsg };
    }

    // 4. Update customer total balances in Supabase
    const customerDeltas = new Map<string, number>();
    for (const e of ledgerEntries) {
      const custId = entryCustomerMap.get(e);
      if (custId) {
        const delta = (e.transaction_type || "credit") === "credit" ? e.amount : -e.amount;
        customerDeltas.set(custId, (customerDeltas.get(custId) || 0) + delta);
      }
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

/**
 * Bulk insert pending fuel tanker arrivals into Supabase 'inventory_arrivals' table.
 */
export async function syncInventoryToCloud(
  entries: InventoryPayload[]
): Promise<SyncResult> {
  if (!entries || entries.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();

    // 1. Ensure referenced products exist in products table to avoid FK constraint violations
    const productIds = Array.from(
      new Set(
        entries
          .map((e) => e.product_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (productIds.length > 0) {
      const { data: existingProducts } = await supabase
        .from("products")
        .select("id")
        .in("id", productIds);

      const existingIdSet = new Set((existingProducts || []).map((p) => p.id));
      const missingIds = productIds.filter((id) => !existingIdSet.has(id));

      if (missingIds.length > 0) {
        const fallbackMap: Record<
          string,
          { name: string; current_sp: number; current_cp: number }
        > = {
          "11111111-1111-4111-8111-111111111111": {
            name: "Petrol",
            current_sp: 270,
            current_cp: 255,
          },
          "22222222-2222-4222-8222-222222222222": {
            name: "Diesel",
            current_sp: 280,
            current_cp: 265,
          },
          "33333333-3333-4333-8333-333333333333": {
            name: "Hi-Octane",
            current_sp: 300,
            current_cp: 285,
          },
        };

        const productsToSeed = missingIds
          .filter((id) => Boolean(fallbackMap[id]))
          .map((id) => ({
            id,
            name: fallbackMap[id].name,
            current_sp: fallbackMap[id].current_sp,
            current_cp: fallbackMap[id].current_cp,
          }));

        if (productsToSeed.length > 0) {
          const { error: seedError } = await supabase
            .from("products")
            .upsert(productsToSeed, { onConflict: "id" });

          if (seedError) {
            console.warn(
              "Warning: Could not auto-seed missing products:",
              seedError.message
            );
          }
        }
      }
    }

    // 2. Format inventory arrivals records
    const formattedEntries = entries.map((e) => ({
      product_id: e.product_id,
      billed_liters: Number(e.billed_liters) || 0,
      actual_received_liters: Number(e.actual_received_liters) || 0,
      cost_per_liter: Number(e.cost_per_liter) || 0,
      created_at: e.created_at || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("inventory_arrivals")
      .insert(formattedEntries)
      .select("id");

    if (error) {
      const isMissingTable =
        error.message?.includes("Could not find the table") ||
        error.message?.includes("schema cache") ||
        error.code === "PGRST205" ||
        error.code === "42P01";

      const fullErrorMsg = isMissingTable
        ? "Supabase table 'public.inventory_arrivals' is missing. Please run migration '0002_profiles_trigger_and_seed.sql' in your Supabase Dashboard SQL Editor."
        : [error.message, error.details, error.hint].filter(Boolean).join(" | ");

      console.error("Supabase insert inventory_arrivals error:", fullErrorMsg);
      return { success: false, error: fullErrorMsg };
    }

    return {
      success: true,
      insertedCount: data ? data.length : entries.length,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to sync inventory to cloud.";
    console.error("syncInventoryToCloud exception:", err);
    return { success: false, error: errorMsg };
  }
}


