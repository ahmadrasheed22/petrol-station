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
  issued_by_worker_name: string;
  received_by_worker_name: string | null;
}

export interface CustomerLedgerResult {
  success: boolean;
  error?: string;
  customer?: {
    id: string;
    name: string;
    phone_number: string;
    total_balance: number;
    latest_transaction_at: string;
  };
  entries?: CustomerLedgerEntry[];
  total_liters?: number;
}

export interface CustomerDirectoryEntry {
  id: string;
  name: string;
  phone_number: string;
  total_balance: number;
  latest_transaction_at: string;
}

type CustomerSummary = Omit<CustomerDirectoryEntry, "latest_transaction_at">;

function getJoinedProfileName(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return getJoinedProfileName(value[0]) || null;
  }
  if (typeof value === "object") {
    const maybeProfile = value as { name?: string | null };
    return maybeProfile.name || null;
  }
  return null;
}

async function buildCustomerLedger(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customer: CustomerSummary
): Promise<CustomerLedgerResult> {
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledger_transactions")
    .select(`
      id, customer_name, liters, amount, applied_sp, transaction_type, status, created_at,
      issuer:profiles!ledger_transactions_issued_by_worker_fkey(name),
      receiver:profiles!ledger_transactions_received_by_worker_fkey(name)
    `)
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
    issued_by_worker_name: getJoinedProfileName(row.issuer) || "Unknown Worker",
    received_by_worker_name: getJoinedProfileName(row.receiver),
  }));

  return {
    success: true,
    customer: {
      ...customer,
      total_balance: Number(customer.total_balance) || 0,
      latest_transaction_at: entries[0]?.created_at || "",
    },
    entries,
    total_liters: entries.reduce(
      (total, entry) => total + (entry.transaction_type === "credit" ? entry.liters : 0),
      0
    ),
  };
}

export async function getCustomerDirectory(): Promise<{
  success: boolean;
  error?: string;
  customers?: CustomerDirectoryEntry[];
}> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth) return { success: false, error: "Sign in to view customer ledgers." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone_number, total_balance, ledger_transactions(created_at)")
    .order("created_at", { referencedTable: "ledger_transactions", ascending: false });

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    customers: (data || [])
      .map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone_number: customer.phone_number || "",
        total_balance: Number(customer.total_balance) || 0,
        latest_transaction_at: customer.ledger_transactions[0]?.created_at || "",
      }))
      .sort((first, second) =>
        second.latest_transaction_at.localeCompare(first.latest_transaction_at)
      ),
  };
}

export async function getCustomerLedgerById(customerId: string): Promise<CustomerLedgerResult> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth) return { success: false, error: "Sign in to view customer ledgers." };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
    return { success: false, error: "Invalid customer." };
  }

  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, phone_number, total_balance")
    .eq("id", customerId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!customer) return { success: true, entries: [], total_liters: 0 };

  return buildCustomerLedger(supabase, {
    id: customer.id,
    name: customer.name,
    phone_number: customer.phone_number || "",
    total_balance: Number(customer.total_balance) || 0,
  });
}

export async function getCustomerLedgerByName(
  customerName: string
): Promise<CustomerLedgerResult> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth) return { success: false, error: "Sign in to search customer ledgers." };

  const normalizedName = customerName.trim();
  if (!normalizedName) {
    return { success: false, error: "Enter a valid customer name." };
  }

  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, phone_number, total_balance")
    .ilike("name", normalizedName)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (customerError) {
    return { success: false, error: customerError.message };
  }
  if (!customer) {
    return { success: true, entries: [], total_liters: 0 };
  }

  return buildCustomerLedger(supabase, {
    id: customer.id,
    name: customer.name,
    phone_number: customer.phone_number || "",
    total_balance: Number(customer.total_balance) || 0,
  });
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

  return buildCustomerLedger(supabase, {
    id: customer.id,
    name: customer.name,
    phone_number: customer.phone_number || "",
    total_balance: Number(customer.total_balance) || 0,
  });
}

export async function markLedgerPaymentReceived(
  transactionId: string
): Promise<{ success: boolean; error?: string; workerName?: string }> {
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

  return { success: true, workerName: auth.profile.name || "Unknown Worker" };
}

export interface PendingApprovalEntry {
  id: string;
  customer_name: string;
  amount: number;
  created_at: string;
  issued_by_worker_name: string;
  received_by_worker_name: string;
}

export interface AdminKhataOverview {
  total_outstanding: number;
  customers: CustomerDirectoryEntry[];
  pending_approvals: PendingApprovalEntry[];
}

export async function getAdminKhataOverview(): Promise<{
  success: boolean;
  error?: string;
  overview?: AdminKhataOverview;
}> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth || auth.profile.role !== "owner") {
    return { success: false, error: "Unauthorized. Only station owners can view Khata approvals." };
  }

  const supabase = await createClient();
  const [{ data: customers, error: customersError }, { data: pendingRows, error: pendingError }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone_number, total_balance, ledger_transactions(created_at)")
        .order("created_at", { referencedTable: "ledger_transactions", ascending: false }),
      supabase
        .from("ledger_transactions")
        .select(`
          id, customer_name, amount, created_at,
          customer:customers(name),
          issuer:profiles!ledger_transactions_issued_by_worker_fkey(name),
          receiver:profiles!ledger_transactions_received_by_worker_fkey(name)
        `)
        .eq("status", "PENDING_APPROVAL")
        .eq("transaction_type", "payment")
        .order("created_at", { ascending: false }),
    ]);

  if (customersError) return { success: false, error: customersError.message };
  if (pendingError) return { success: false, error: pendingError.message };

  const directory = (customers || [])
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone_number: customer.phone_number || "",
      total_balance: Number(customer.total_balance) || 0,
      latest_transaction_at: customer.ledger_transactions[0]?.created_at || "",
    }))
    .sort((first, second) => second.latest_transaction_at.localeCompare(first.latest_transaction_at));

  return {
    success: true,
    overview: {
      total_outstanding: directory.reduce(
        (total, customer) => total + Math.max(customer.total_balance, 0),
        0
      ),
      customers: directory,
      pending_approvals: (pendingRows || []).map((row) => ({
        id: row.id,
        customer_name: getJoinedProfileName(row.customer) || row.customer_name || "Unknown Customer",
        amount: Number(row.amount) || 0,
        created_at: row.created_at,
        issued_by_worker_name: getJoinedProfileName(row.issuer) || "Unknown Worker",
        received_by_worker_name: getJoinedProfileName(row.receiver) || "Unknown Worker",
      })),
    },
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function updateLedgerApproval(
  transactionId: string,
  status: "SETTLED" | "UNPAID"
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth || auth.profile.role !== "owner") {
    return { success: false, error: "Unauthorized. Only station owners can review payments." };
  }
  if (status !== "SETTLED" && status !== "UNPAID") {
    return { success: false, error: "Invalid approval status." };
  }
  if (!isUuid(transactionId)) return { success: false, error: "Invalid ledger entry." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ledger_transactions")
    .update({ status })
    .eq("id", transactionId)
    .eq("status", "PENDING_APPROVAL")
    .select("id")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "This payment is no longer pending. Refresh the queue." };
  return { success: true };
}

export async function bulkApproveLedgerPayments(
  transactionIds: string[]
): Promise<{ success: boolean; error?: string; settledCount?: number }> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth || auth.profile.role !== "owner") {
    return { success: false, error: "Unauthorized. Only station owners can approve payments." };
  }
  const ids = Array.isArray(transactionIds) ? [...new Set(transactionIds)] : [];
  if (ids.length === 0 || ids.length > 100 || ids.some((id) => typeof id !== "string" || !isUuid(id))) {
    return { success: false, error: "Select valid pending payments." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ledger_transactions")
    .update({ status: "SETTLED" })
    .in("id", ids)
    .eq("status", "PENDING_APPROVAL")
    .select("id");

  if (error) return { success: false, error: error.message };
  return { success: true, settledCount: data?.length || 0 };
}