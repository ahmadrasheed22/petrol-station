"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { revalidatePath } from "next/cache";

export interface CustomerLedgerEntry {
  id: string;
  customer_name: string | null;
  liters: number;
  amount: number;
  applied_sp: number;
  transaction_type: "credit" | "payment";
  status: "UNPAID" | "PENDING_APPROVAL" | "SETTLED";
  created_at: string;
  received_at: string | null;
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
    has_pending_approval: boolean;
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
  has_pending_approval: boolean;
}

export interface CloudLedgerSyncEntry {
  id: string;
  client_id: string | null;
  customer_id: string;
  status: "UNPAID" | "PENDING_APPROVAL" | "SETTLED";
  received_at: string | null;
  issued_by_worker_name: string | null;
  received_by_worker_name: string | null;
}

type CustomerSummary = Omit<CustomerDirectoryEntry, "latest_transaction_at" | "has_pending_approval">;

function calculateOutstandingBalance(
  entries: Array<{ amount: unknown; transaction_type: unknown; status: unknown }>
): number {
  return entries.reduce((total, entry) => {
    if (entry.status === "SETTLED") return total;
    const amount = Number(entry.amount) || 0;
    return total + (entry.transaction_type === "credit" ? amount : -amount);
  }, 0);
}

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
  customer: CustomerSummary,
  currentProfile: { id: string; name: string }
): Promise<CustomerLedgerResult> {
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledger_transactions")
    .select(`
      id, customer_name, liters, amount, applied_sp, transaction_type, status, created_at, received_at,
      issued_by_worker, received_by_worker,
      issuer:profiles!ledger_transactions_issued_by_worker_fkey(name),
      receiver:profiles!ledger_transactions_received_by_worker_fkey(name)
    `)
    .eq("customer_id", customer.id)
    .neq("status", "SETTLED")
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
    received_at: row.received_at,
    issued_by_worker_name:
      getJoinedProfileName(row.issuer) ||
      (row.issued_by_worker === currentProfile.id ? currentProfile.name : "Unknown Worker"),
    received_by_worker_name:
      getJoinedProfileName(row.receiver) ||
      (row.received_by_worker === currentProfile.id ? currentProfile.name : null),
  }));

  return {
    success: true,
    customer: {
      ...customer,
      total_balance: calculateOutstandingBalance(ledgerRows || []),
      latest_transaction_at: entries[0]?.created_at || "",
      has_pending_approval: entries.some((entry) => entry.status === "PENDING_APPROVAL"),
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
  sync_customers?: Array<{ id: string; total_balance: number }>;
  ledger_sync_entries?: CloudLedgerSyncEntry[];
}> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth) return { success: false, error: "Sign in to view customer ledgers." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(`
      id, name, phone_number,
      ledger_transactions(
        id, client_id, customer_id, amount, transaction_type, status, created_at, received_at,
        issued_by_worker, received_by_worker,
        issuer:profiles!ledger_transactions_issued_by_worker_fkey(name),
        receiver:profiles!ledger_transactions_received_by_worker_fkey(name)
      )
    `)
    .order("created_at", { referencedTable: "ledger_transactions", ascending: false });

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    sync_customers: (data || []).map((customer) => ({
      id: customer.id,
      total_balance: calculateOutstandingBalance(customer.ledger_transactions || []),
    })),
    ledger_sync_entries: (data || []).flatMap((customer) =>
      (customer.ledger_transactions || []).map((entry) => ({
        id: entry.id,
        client_id: entry.client_id || null,
        customer_id: entry.customer_id || customer.id,
        status: entry.status as CloudLedgerSyncEntry["status"],
        received_at: entry.received_at || null,
        issued_by_worker_name:
          getJoinedProfileName(entry.issuer) ||
          (entry.issued_by_worker === auth.profile.id ? auth.profile.name : null),
        received_by_worker_name:
          getJoinedProfileName(entry.receiver) ||
          (entry.received_by_worker === auth.profile.id ? auth.profile.name : null),
      }))
    ),
    customers: (data || [])
      .map((customer) => {
        const ledgerEntries = customer.ledger_transactions || [];
        const totalBalance = calculateOutstandingBalance(ledgerEntries);
        const hasPendingApproval = ledgerEntries.some((entry) => entry.status === "PENDING_APPROVAL");
        return {
        id: customer.id,
        name: customer.name,
        phone_number: customer.phone_number || "",
        total_balance: totalBalance,
        has_pending_approval: hasPendingApproval,
        latest_transaction_at: ledgerEntries[0]?.created_at || "",
        };
      })
      .filter((customer) => customer.total_balance > 0)
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
  }, auth.profile);
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
  }, auth.profile);
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
  }, auth.profile);
}

export async function markLedgerPaymentReceived(
  transactionId: string
): Promise<{ success: boolean; error?: string; workerName?: string; receivedAt?: string }> {
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
    .update({
      status: "PENDING_APPROVAL",
      received_by_worker: auth.profile.id,
      received_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .in("status", ["UNPAID", "PENDING_APPROVAL"])
    .select("id, received_at, status")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) {
    return { success: false, error: "This entry is no longer unpaid. Refresh the ledger." };
  }

  return {
    success: true,
    workerName: auth.profile.name || "Unknown Worker",
    receivedAt: data.received_at,
  };
}

export interface PendingApprovalEntry {
  id: string;
  customer_name: string;
  amount: number;
  created_at: string;
  issued_by_worker_name: string;
  received_by_worker_name: string;
}

export interface WorkerPendingCollection {
  id: string;
  client_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  created_at: string;
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
        .select("id, name, phone_number, ledger_transactions(amount, transaction_type, status, created_at)")
        .order("created_at", { referencedTable: "ledger_transactions", ascending: false }),
      supabase
        .from("ledger_transactions")
        .select(`
          id, customer_id, customer_name, amount, created_at, status,
          customer:customers(name),
          issuer:profiles!ledger_transactions_issued_by_worker_fkey(name),
          receiver:profiles!ledger_transactions_received_by_worker_fkey(name)
        `)
        .eq("status", "PENDING_APPROVAL")
        .order("created_at", { ascending: false }),
    ]);

  if (customersError) return { success: false, error: customersError.message };
  if (pendingError) return { success: false, error: pendingError.message };

  const directory = (customers || [])
    .map((customer) => {
      const ledgerEntries = customer.ledger_transactions || [];
      return {
      id: customer.id,
      name: customer.name,
      phone_number: customer.phone_number || "",
      total_balance: calculateOutstandingBalance(ledgerEntries),
      has_pending_approval: ledgerEntries.some((entry) => entry.status === "PENDING_APPROVAL"),
      latest_transaction_at: ledgerEntries[0]?.created_at || "",
      };
    })
    .filter((customer) => customer.total_balance > 0)
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

export async function getWorkerPendingCollections(): Promise<{
  success: boolean;
  error?: string;
  entries?: WorkerPendingCollection[];
}> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth || auth.profile.role !== "worker") {
    return { success: false, error: "Only authenticated workers can view pending collections." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ledger_transactions")
    .select("id, client_id, customer_id, customer_name, amount, created_at, status, customer:customers(name)")
    .eq("received_by_worker", auth.profile.id)
    .eq("status", "PENDING_APPROVAL")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    entries: (data || []).map((row) => ({
      id: row.id,
      client_id: row.client_id || row.id,
      customer_id: row.customer_id,
      customer_name: getJoinedProfileName(row.customer) || row.customer_name || "Unknown Customer",
      amount: Number(row.amount) || 0,
      created_at: row.created_at,
    })),
  };
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

  const supabase = await createClient();
  const adminClient = getAdminClient();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
    return { success: false, error: "This payment could not be found for review." };
  }

  const writableClient = adminClient ?? supabase;
  const { data, error } = await writableClient
    .from("ledger_transactions")
    .update({
      status,
      ...(status === "UNPAID" ? { received_by_worker: null, received_at: null } : {}),
    })
    .eq("id", transactionId)
    .eq("status", "PENDING_APPROVAL")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Real Supabase Error:", error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "This payment could not be updated." };
  }

  revalidatePath("/admin/khata");
  revalidatePath("/khata");
  return { success: true };
}

export async function bulkApproveLedgerPayments(
  transactionIds: string[]
): Promise<{ success: boolean; error?: string; settledCount?: number }> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth || auth.profile.role !== "owner") {
    return { success: false, error: "Unauthorized. Only station owners can approve payments." };
  }

  const ids = Array.isArray(transactionIds)
    ? [...new Set(transactionIds.filter((id) => typeof id === "string" && id.trim().length > 0))]
    : [];
  if (ids.length === 0 || ids.length > 100) {
    return { success: false, error: "Select valid pending payments." };
  }

  const supabase = await createClient();
  const adminClient = getAdminClient();
  const resolvedIds = ids.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  if (resolvedIds.length === 0) {
    return { success: false, error: "No valid pending payments were found to approve." };
  }

  const writableClient = adminClient ?? supabase;
  const { data, error } = await writableClient
    .from("ledger_transactions")
    .update({ status: "SETTLED" })
    .in("id", resolvedIds)
    .eq("status", "PENDING_APPROVAL")
    .select("id");

  if (error) {
    console.error("Real Supabase Error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/khata");
  revalidatePath("/khata");
  return { success: true, settledCount: data?.length || 0 };
}