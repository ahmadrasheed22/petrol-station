import { createClient } from "@/lib/supabase/server";
import type { LedgerPayload, SyncResult } from "@/actions/db-actions";

export async function syncLedgerToCloudService(
  ledgerEntries: LedgerPayload[]
): Promise<SyncResult> {
  if (!ledgerEntries || ledgerEntries.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();
    const entryCustomerMap = new Map<LedgerPayload, string | null>();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const providedUuids = Array.from(
      new Set(
        ledgerEntries
          .map((entry) => entry.customer_id)
          .filter((id): id is string => Boolean(id && uuidRegex.test(id)))
      )
    );

    let existingCustomerIds = new Set<string>();
    if (providedUuids.length > 0) {
      const { data: existingCustomers } = await supabase
        .from("customers")
        .select("id")
        .in("id", providedUuids);
      existingCustomerIds = new Set((existingCustomers || []).map((customer) => customer.id));
    }

    const namesToResolve = Array.from(
      new Set(
        ledgerEntries
          .filter((entry) => !entry.customer_id || !existingCustomerIds.has(entry.customer_id))
          .map((entry) => entry.customer_name?.trim())
          .filter((name): name is string => Boolean(name))
      )
    );

    const nameToIdMap = new Map<string, string>();
    if (namesToResolve.length > 0) {
      const { data: matchedByName } = await supabase
        .from("customers")
        .select("id, name")
        .in("name", namesToResolve);

      (matchedByName || []).forEach((customer) => {
        nameToIdMap.set(customer.name.toLowerCase(), customer.id);
      });

      const missingNames = namesToResolve.filter((name) => !nameToIdMap.has(name.toLowerCase()));
      if (missingNames.length > 0) {
        const newCustomers = missingNames.map((name) => ({
          name,
          total_balance: 0,
          updated_at: new Date().toISOString(),
        }));

        const { data: createdCustomers, error: createCustomerError } = await supabase
          .from("customers")
          .insert(newCustomers)
          .select("id, name");

        if (!createCustomerError && createdCustomers) {
          createdCustomers.forEach((customer) => {
            nameToIdMap.set(customer.name.toLowerCase(), customer.id);
          });
        }
      }
    }

    for (const entry of ledgerEntries) {
      if (entry.customer_id && existingCustomerIds.has(entry.customer_id)) {
        entryCustomerMap.set(entry, entry.customer_id);
      } else if (
        entry.customer_name &&
        nameToIdMap.has(entry.customer_name.trim().toLowerCase())
      ) {
        entryCustomerMap.set(entry, nameToIdMap.get(entry.customer_name.trim().toLowerCase())!);
      } else {
        entryCustomerMap.set(entry, null);
      }
    }

    const workerIds = Array.from(
      new Set(
        ledgerEntries
          .map((entry) => entry.worker_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let validWorkerIds = new Set<string>();
    if (workerIds.length > 0) {
      const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("id", workerIds);
      validWorkerIds = new Set((existingProfiles || []).map((profile) => profile.id));
    }

    const formattedEntries = ledgerEntries.map((entry) => {
      const price = entry.price_per_liter ?? entry.applied_sp ?? 0;
      const resolvedCustomerId = entryCustomerMap.get(entry);
      return {
        customer_id: resolvedCustomerId,
        customer_name: entry.customer_name || null,
        worker_id:
          entry.worker_id && validWorkerIds.has(entry.worker_id) ? entry.worker_id : null,
        liters: entry.liters ?? 0,
        amount: entry.amount ?? 0,
        price_per_liter: price,
        applied_sp: price,
        transaction_type: entry.transaction_type || "credit",
        created_at: entry.created_at || new Date().toISOString(),
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

      const fullErrorMessage = isMissingTable
        ? "Supabase table 'public.ledger_transactions' is missing. Please run migrations in your Supabase Dashboard SQL Editor."
        : [error.message, error.details, error.hint].filter(Boolean).join(" | ");

      console.error("Supabase insert ledger_transactions error:", fullErrorMessage);
      return { success: false, error: fullErrorMessage };
    }

    const customerDeltas = new Map<string, number>();
    for (const entry of ledgerEntries) {
      const customerId = entryCustomerMap.get(entry);
      if (customerId) {
        const delta = (entry.transaction_type || "credit") === "credit" ? entry.amount : -entry.amount;
        customerDeltas.set(customerId, (customerDeltas.get(customerId) || 0) + delta);
      }
    }

    for (const [customerId, delta] of customerDeltas.entries()) {
      try {
        const { data: customerData } = await supabase
          .from("customers")
          .select("total_balance")
          .eq("id", customerId)
          .single();

        if (customerData) {
          const currentBalance = Number(customerData.total_balance) || 0;
          await supabase
            .from("customers")
            .update({
              total_balance: currentBalance + delta,
              updated_at: new Date().toISOString(),
            })
            .eq("id", customerId);
        }
      } catch (balanceError) {
        console.warn(`Could not update balance for customer ${customerId}:`, balanceError);
      }
    }

    return {
      success: true,
      insertedCount: data ? data.length : ledgerEntries.length,
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to sync ledger to cloud.";
    console.error("syncLedgerToCloud exception:", err);
    return { success: false, error: errorMessage };
  }
}