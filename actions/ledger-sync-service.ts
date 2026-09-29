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
      const { data: existingCustomers, error } = await supabase
        .from("customers")
        .select("id")
        .in("id", providedUuids);
      if (error) return { success: false, error: `Customer lookup failed: ${error.message}` };
      existingCustomerIds = new Set((existingCustomers || []).map((customer) => customer.id));
    }

    const unresolvedEntries = ledgerEntries.filter(
      (entry) => !entry.customer_id || !existingCustomerIds.has(entry.customer_id)
    );
    const phoneNumbersToResolve = Array.from(
      new Set(
        unresolvedEntries
          .map((entry) => entry.phone_number?.trim())
          .filter((phone): phone is string => Boolean(phone))
      )
    ) as string[];
    const phoneToIdMap = new Map<string, string>();
    const nameToIdMap = new Map<string, string>();
    if (phoneNumbersToResolve.length > 0) {
      const { data: matchedByName, error } = await supabase
        .from("customers")
        .select("id, phone_number")
        .in("phone_number", phoneNumbersToResolve);
      if (error) return { success: false, error: `Customer lookup failed: ${error.message}` };

      (matchedByName || []).forEach((customer) => {
        phoneToIdMap.set(customer.phone_number, customer.id);
      });
    }

    const nameOnlyEntries = unresolvedEntries.filter((entry) => !entry.phone_number?.trim());
    const customerNamesToResolve = Array.from(
      new Set(nameOnlyEntries.map((entry) => entry.customer_name?.trim() || "Walk-in Customer"))
    );
    if (customerNamesToResolve.length > 0) {
      const nameLookups = await Promise.all(
        customerNamesToResolve.map((name) =>
          supabase
            .from("customers")
            .select("id, name")
            .ilike("name", name.replace(/[\\%_]/g, "\\$&"))
        )
      );
      for (const { data: matchedCustomers, error } of nameLookups) {
        if (error) return { success: false, error: `Customer lookup failed: ${error.message}` };
        (matchedCustomers || []).forEach((customer) => {
          const normalizedName = customer.name.trim().toLowerCase();
          if (!nameToIdMap.has(normalizedName)) {
            nameToIdMap.set(normalizedName, customer.id);
          }
        });
      }
    }

    const seenCustomerKeys = new Set<string>();
    const missingCustomers = unresolvedEntries.flatMap((entry) => {
      const name = entry.customer_name?.trim() || "Walk-in Customer";
      const phone = entry.phone_number?.trim() || "";
      const key = phone ? `phone:${phone}` : `name:${name.toLowerCase()}`;
      const isResolved = phone
        ? phoneToIdMap.has(phone)
        : nameToIdMap.has(name.toLowerCase());
      if (isResolved || seenCustomerKeys.has(key)) return [];
      seenCustomerKeys.add(key);
      return [{
        name,
        phone_number: phone,
        total_balance: 0,
        updated_at: new Date().toISOString(),
      }];
    });

    if (missingCustomers.length > 0) {
      const { data: createdCustomers, error: createCustomerError } = await supabase
        .from("customers")
        .insert(missingCustomers)
        .select("id, phone_number, name");

      if (createCustomerError) {
        const message = [createCustomerError.message, createCustomerError.details, createCustomerError.hint]
          .filter(Boolean)
          .join(" | ");
        console.error("Supabase insert customers error:", message);
        return { success: false, error: `Customer creation failed: ${message}` };
      }

      (createdCustomers || []).forEach((customer) => {
        if (customer.phone_number?.trim()) {
          phoneToIdMap.set(customer.phone_number.trim(), customer.id);
        } else {
          nameToIdMap.set(customer.name.trim().toLowerCase(), customer.id);
        }
      });
    }

    for (const entry of ledgerEntries) {
      if (entry.customer_id && existingCustomerIds.has(entry.customer_id)) {
        entryCustomerMap.set(entry, entry.customer_id);
      } else if (
        entry.phone_number?.trim() &&
        phoneToIdMap.has(entry.phone_number.trim())
      ) {
        entryCustomerMap.set(entry, phoneToIdMap.get(entry.phone_number.trim())!);
      } else {
        const customerName = entry.customer_name?.trim() || "Walk-in Customer";
        entryCustomerMap.set(entry, nameToIdMap.get(customerName.toLowerCase()) || null);
      }
    }

    const unresolvedCustomer = ledgerEntries.find((entry) => !entryCustomerMap.get(entry));
    if (unresolvedCustomer) {
      return {
        success: false,
        error: `Could not resolve a cloud customer for "${unresolvedCustomer.customer_name?.trim() || "Walk-in Customer"}".`,
      };
    }

    const workerIds = Array.from(
      new Set(
        ledgerEntries
          .flatMap((entry) => [entry.worker_id, entry.issued_by_worker, entry.received_by_worker])
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
        id: entry.id,
        customer_id: resolvedCustomerId,
        customer_name: entry.customer_name || null,
        worker_id:
          entry.worker_id && validWorkerIds.has(entry.worker_id) ? entry.worker_id : null,
        issued_by_worker:
          entry.issued_by_worker && validWorkerIds.has(entry.issued_by_worker)
            ? entry.issued_by_worker
            : entry.transaction_type === "credit" && entry.worker_id && validWorkerIds.has(entry.worker_id)
              ? entry.worker_id
              : null,
        received_by_worker:
          entry.received_by_worker && validWorkerIds.has(entry.received_by_worker)
            ? entry.received_by_worker
            : entry.transaction_type === "payment" && entry.worker_id && validWorkerIds.has(entry.worker_id)
              ? entry.worker_id
              : null,
        liters: entry.liters ?? 0,
        amount: entry.amount ?? 0,
        price_per_liter: price,
        applied_sp: price,
        transaction_type: entry.transaction_type || "credit",
        status: entry.status || (entry.transaction_type === "payment" ? "PENDING_APPROVAL" : "UNPAID"),
        received_at: entry.received_at || null,
        updated_at: entry.updated_at || new Date().toISOString(),
        created_at: entry.created_at || new Date().toISOString(),
      };
    });

    const entryIds = formattedEntries
      .map((entry) => entry.id)
      .filter((id): id is string => Boolean(id));
    const existingLedgerIds = new Set<string>();
    const settledLedgerIds = new Set<string>();
    if (entryIds.length > 0) {
      const { data: existingLedgerEntries, error: existingLedgerError } = await supabase
        .from("ledger_transactions")
        .select("id, status")
        .in("id", entryIds);
      if (existingLedgerError) {
        return { success: false, error: `Ledger lookup failed: ${existingLedgerError.message}` };
      }
      for (const entry of existingLedgerEntries || []) {
        existingLedgerIds.add(entry.id);
        if (entry.status === "SETTLED") settledLedgerIds.add(entry.id);
      }
    }

    const entriesToInsert = formattedEntries.filter((entry) => !entry.id || !existingLedgerIds.has(entry.id));
    const entriesToApprove = formattedEntries.filter((entry) =>
      entry.id &&
      existingLedgerIds.has(entry.id) &&
      !settledLedgerIds.has(entry.id) &&
      entry.status === "PENDING_APPROVAL"
    );
    if (entriesToInsert.length === 0 && entriesToApprove.length === 0) {
      return { success: true, insertedCount: 0 };
    }

    console.error("Ledger sync starting:", {
      insertCount: entriesToInsert.length,
      approvalCount: entriesToApprove.length,
      entries: [...entriesToInsert, ...entriesToApprove].map((entry) => ({
        id: entry.id,
        status: entry.status,
        updated_at: entry.updated_at,
      })),
    });

    const insertedRows = entriesToInsert.length > 0
      ? await supabase
        .from("ledger_transactions")
        .insert(entriesToInsert)
        .select("id")
      : { data: [], error: null };

    if (insertedRows.error) {
      const isMissingTable =
        insertedRows.error.message?.includes("Could not find the table") ||
        insertedRows.error.message?.includes("schema cache") ||
        insertedRows.error.code === "PGRST205" ||
        insertedRows.error.code === "42P01";

      const fullErrorMessage = isMissingTable
        ? "Supabase table 'public.ledger_transactions' is missing. Please run migrations in your Supabase Dashboard SQL Editor."
        : [insertedRows.error.message, insertedRows.error.details, insertedRows.error.hint].filter(Boolean).join(" | ");

      console.error("Supabase ledger_transactions upsert rejected:", {
        error: fullErrorMessage,
        code: insertedRows.error.code,
        details: insertedRows.error.details,
        hint: insertedRows.error.hint,
        entries: formattedEntries.map((entry) => ({
          id: entry.id,
          status: entry.status,
          received_by_worker: entry.received_by_worker,
          updated_at: entry.updated_at,
        })),
      });
      return { success: false, error: fullErrorMessage };
    }

    for (const entry of entriesToApprove) {
      const { error } = await supabase
        .from("ledger_transactions")
        .update({
          status: "PENDING_APPROVAL",
          received_by_worker: entry.received_by_worker,
          received_at: entry.received_at,
          updated_at: entry.updated_at,
        })
        .eq("id", entry.id)
        .eq("status", "UNPAID");
      if (error) {
        return { success: false, error: `Ledger approval sync failed: ${error.message}` };
      }
    }

    const insertedIds = new Set((insertedRows.data || []).map((entry) => entry.id));
    const customerDeltas = new Map<string, number>();
    for (const entry of ledgerEntries) {
      if (!entry.id || !insertedIds.has(entry.id) || existingLedgerIds.has(entry.id)) continue;
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
      insertedCount: insertedRows.data?.length || entriesToApprove.length,
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to sync ledger to cloud.";
    console.error("syncLedgerToCloud exception:", err);
    return { success: false, error: errorMessage };
  }
}