"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";

export interface CustomerLedgerEntry {
  id: string;
  customer_name: string | null;
  liters: number;
  amount: number;
  applied_sp: number;
  transaction_type: "credit" | "payment";
  status: "UNPAID" | "PENDING_APPROVAL" | "SETTLED";
  created_at: string;
}

export interface CustomerLedgerResult {
  success: boolean;
  error?: string;
  customer?: {
    id: string;
    name: string;
    phone_number: string;
    total_balance: number;
  };
  entries?: CustomerLedgerEntry[];
  total_liters?: number;
}

export async function getCustomerLedgerByPhone(
  phoneNumber: string
): Promise<CustomerLedgerResult> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth) return { success: false, error: "Sign in to search customer ledgers." };

  const normalizedPhone = phoneNumber.trim();
  if (!normalizedPhone || normalizedPhone.length > 40) {
    return { success: false, error: "Enter a valid customer phone number." };
  }

  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, phone_number, total_balance")
    .eq("phone_number", normalizedPhone)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (customerError) {
    return { success: false, error: customerError.message };
  }
  if (!customer) {
    return { success: true, entries: [], total_liters: 0 };
  }

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledger_transactions")
    .select("id, customer_name, liters, amount, applied_sp, transaction_type, status, created_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  if (ledgerError) {
    return { success: false, error: ledgerError.message };
  }

  const entries: CustomerLedgerEntry[] = (ledgerRows || []).map((row) => ({
    id: row.id,
    customer_name: row.customer_name,
    liters: Number(row.liters) || 0,
    amount: Number(row.amount) || 0,
    applied_sp: Number(row.applied_sp) || 0,
    transaction_type: row.transaction_type as "credit" | "payment",
    status: row.status as CustomerLedgerEntry["status"],
    created_at: row.created_at,
  }));

  return {
    success: true,
    customer: {
      id: customer.id,
      name: customer.name,
      phone_number: customer.phone_number,
      total_balance: Number(customer.total_balance) || 0,
    },
    entries,
    total_liters: entries.reduce(
      (total, entry) => total + (entry.transaction_type === "credit" ? entry.liters : 0),
      0
    ),
  };
}

export async function markLedgerPaymentReceived(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth) return { success: false, error: "Sign in to record a payment." };
  if (auth.profile.role !== "worker") {
    return { success: false, error: "Only an authenticated worker can record receipt." };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
    return { success: false, error: "Invalid ledger entry." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ledger_transactions")
    .update({ status: "PENDING_APPROVAL", received_by_worker: auth.profile.id })
    .eq("id", transactionId)
    .eq("status", "UNPAID")
    .select("id")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return { success: false, error: "This entry is no longer unpaid. Refresh the ledger." };
  }

  return { success: true };
}