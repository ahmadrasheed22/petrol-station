"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getCustomerDirectory,
  getCustomerLedgerById,
  markLedgerPaymentReceived,
  type CustomerDirectoryEntry,
  type CustomerLedgerEntry,
} from "@/actions/khata-actions";
import { db, type CustomerRecord, type PendingLedgerTransaction } from "@/lib/offline-db";

function getCustomerKey(name: string, phoneNumber: string): string {
  const normalizedPhone = phoneNumber.trim();
  return normalizedPhone
    ? `phone:${normalizedPhone}`
    : `name:${name.trim().toLocaleLowerCase()}`;
}

export default function WorkerCustomerLedger({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerDirectoryEntry[]>([]);
  const [customer, setCustomer] = useState<CustomerDirectoryEntry | null>(null);
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [totalLiters, setTotalLiters] = useState(0);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const offlineDirectory = useLiveQuery(
    async () => {
      const [offlineCustomers, ledgerTransactions] = await Promise.all([
        db.customers.toArray(),
        db.pendingLedgerTransactions
          .filter((transaction) => transaction.sync_status !== "draft")
          .toArray(),
      ]);
      return { offlineCustomers, ledgerTransactions };
    },
    [],
    { offlineCustomers: [], ledgerTransactions: [] }
  );

  const refreshDirectory = useCallback(() => {
    void getCustomerDirectory()
      .then((result) => {
        if (!result.success) {
          setError(result.error || "Unable to load the customer directory.");
          return;
        }
        setError("");
        setCustomers(result.customers || []);
      })
      .catch(() => setError("Unable to load the customer directory."))
      .finally(() => setIsLoadingDirectory(false));
  }, []);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory, refreshKey]);

  async function openCustomerById(customerId: string) {
    setError("");
    setCustomer(customers.find((item) => item.id === customerId) || null);
    setEntries([]);
    setTotalLiters(0);
    setIsLoadingDetail(true);
    const result = await getCustomerLedgerById(customerId);
    if (!result.success) {
      setError(result.error || "Unable to load this customer ledger.");
      setIsLoadingDetail(false);
      return;
    }
    if (!result.customer) {
      setError("This customer could not be found in the cloud ledger.");
      setIsLoadingDetail(false);
      return;
    }
    setCustomer(result.customer);
    setCustomers((current) => [
      result.customer!,
      ...current.filter((item) => item.id !== result.customer!.id),
    ]);
    setEntries(result.entries || []);
    setTotalLiters(result.total_liters || 0);
    setIsLoadingDetail(false);
  }

  useEffect(() => {
    const handleSyncComplete = () => void refreshDirectory();
    window.addEventListener("offline-sync-complete", handleSyncComplete);
    return () => window.removeEventListener("offline-sync-complete", handleSyncComplete);
  }, [refreshDirectory]);

  const directoryCustomers = useMemo(() => {
    const merged = new Map<string, CustomerDirectoryEntry>();
    const cloudByName = new Map<string, string>();
    for (const cloudCustomer of customers) {
      const key = getCustomerKey(cloudCustomer.name, cloudCustomer.phone_number || "");
      merged.set(key, cloudCustomer);
      cloudByName.set(cloudCustomer.name.trim().toLocaleLowerCase(), key);
    }

    const offlineCustomersById = new Map(
      (offlineDirectory?.offlineCustomers || []).map((offlineCustomer) => [
        offlineCustomer.id,
        offlineCustomer,
      ])
    );
    const localGroups = new Map<string, {
      name: string;
      phoneNumber: string;
      transactions: PendingLedgerTransaction[];
      customers: Map<string, CustomerRecord>;
    }>();

    for (const transaction of offlineDirectory?.ledgerTransactions || []) {
      const localCustomer = transaction.customer_id
        ? offlineCustomersById.get(transaction.customer_id)
        : undefined;
      const name = localCustomer?.name || transaction.customer_name || "Walk-in Customer";
      const phoneNumber = localCustomer?.phone_number || transaction.phone_number || "";
      const key = getCustomerKey(name, phoneNumber);
      const group = localGroups.get(key) || {
        name,
        phoneNumber,
        transactions: [],
        customers: new Map<string, CustomerRecord>(),
      };
      group.transactions.push(transaction);
      if (localCustomer) group.customers.set(localCustomer.id, localCustomer);
      localGroups.set(key, group);
    }

    for (const [key, group] of localGroups) {
      const cloudKey = merged.has(key)
        ? key
        : group.phoneNumber
          ? undefined
          : cloudByName.get(group.name.trim().toLocaleLowerCase());
      const existing = cloudKey ? merged.get(cloudKey) : undefined;
      const latestLocalTransaction = group.transactions.reduce(
        (latest, transaction) => transaction.created_at > latest ? transaction.created_at : latest,
        ""
      );

      if (existing && cloudKey) {
        const pendingDelta = group.transactions.reduce((total, transaction) => {
          if (transaction.sync_status !== "pending" && transaction.sync_status !== "failed") {
            return total;
          }
          return total + (transaction.transaction_type === "credit" ? transaction.amount : -transaction.amount);
        }, 0);
        merged.set(cloudKey, {
          ...existing,
          total_balance: existing.total_balance + pendingDelta,
          latest_transaction_at:
            latestLocalTransaction > existing.latest_transaction_at
              ? latestLocalTransaction
              : existing.latest_transaction_at,
        });
        continue;
      }

      const localCustomers = Array.from(group.customers.values());
      const totalBalance = localCustomers.length > 0
        ? localCustomers.reduce((total, localCustomer) => total + localCustomer.total_balance, 0)
        : group.transactions.reduce(
            (total, transaction) => total + (transaction.transaction_type === "credit" ? transaction.amount : -transaction.amount),
            0
          );
      merged.set(key, {
        id: localCustomers[0]?.id || group.transactions[0].customer_id || `offline:${key}`,
        name: group.name,
        phone_number: group.phoneNumber,
        total_balance: totalBalance,
        latest_transaction_at: latestLocalTransaction,
      });
    }

    return Array.from(merged.values()).sort((first, second) =>
      second.latest_transaction_at.localeCompare(first.latest_transaction_at)
    );
  }, [customers, offlineDirectory]);

  function markReceived(entryId: string) {
    setError("");
    setUpdatingId(entryId);
    startTransition(async () => {
      const result = await markLedgerPaymentReceived(entryId);
      if (!result.success) {
        setError(result.error || "Unable to record payment receipt.");
        setUpdatingId(null);
        return;
      }
      setEntries((current) => current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              status: "PENDING_APPROVAL",
              received_by_worker_name: result.workerName || "Unknown Worker",
            }
          : entry
      ));
      setUpdatingId(null);
    });
  }

  const filteredCustomers = directoryCustomers.filter((item) => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return !query || item.name.toLocaleLowerCase().includes(query) ||
      item.phone_number.toLocaleLowerCase().includes(query);
  });

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl sm:p-6">
      {customer ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Customer Ledger</h2>
            <p className="mt-1 text-xs text-zinc-400">Cloud transaction history</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCustomer(null);
              setError("");
              void refreshDirectory();
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
          >
            &lt;- Back to List
          </button>
        </div>
      ) : (
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">Customer Directory</h2>
          <p className="mt-1 text-xs text-zinc-400">Search by customer name or phone number</p>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {!customer && (
        <div className="mb-4">
          <label className="sr-only" htmlFor="ledger-customer-search">Search customer name or phone</label>
          <input
            id="ledger-customer-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name or phone number"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      )}

      {customer && (
        <div className="space-y-4 transition-opacity duration-200">
          {isLoadingDetail ? (
            <div className="animate-pulse space-y-3" aria-label="Loading ledger">
              <div className="h-20 rounded-xl bg-zinc-800/70" />
              <div className="h-24 rounded-xl bg-zinc-800/50" />
            </div>
          ) : (
            <>
              <div className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold text-white">{customer.name}</h3>
                  <p className="mt-1 font-mono text-xs text-zinc-400">{customer.phone_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <p className="text-[10px] uppercase text-zinc-400">Total Liters</p>
                    <p className="mt-1 text-lg font-bold text-emerald-300">{totalLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <p className="text-[10px] uppercase text-zinc-400">Amount Due</p>
                    <p className="mt-1 text-lg font-bold text-amber-300">Rs. {customer.total_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
                {entries.length === 0 ? (
                  <p className="p-6 text-center text-sm text-zinc-500">No ledger transactions for this customer.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/80">
                    {entries.map((entry) => (
                      <li key={entry.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium capitalize text-white">{entry.transaction_type}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              entry.status === "UNPAID"
                                ? "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                                : entry.status === "PENDING_APPROVAL"
                                  ? "border border-yellow-400/20 bg-yellow-400/10 text-yellow-200"
                                  : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            }`}>
                              {entry.status === "PENDING_APPROVAL" ? "Waiting for Owner Approval" : entry.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-zinc-300">
                            {new Date(entry.created_at).toLocaleString()}
                          </p>
                          {entry.liters > 0 && (
                            <p className="mt-1 text-xs text-zinc-500">{entry.liters.toLocaleString()} L</p>
                          )}
                          <p className="mt-1 text-xs text-zinc-400">
                            Issued by: <span className="text-zinc-300">{entry.issued_by_worker_name || "Unknown Worker"}</span>
                          </p>
                          {entry.status === "PENDING_APPROVAL" && (
                            <p className="mt-1 text-xs text-yellow-200">
                              Received by: {entry.received_by_worker_name || "Unknown Worker"}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <span className="whitespace-nowrap text-sm font-semibold text-zinc-200">Rs. {entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          {entry.status === "UNPAID" && (
                            <button
                              type="button"
                              onClick={() => markReceived(entry.id)}
                              disabled={isPending}
                              className="whitespace-nowrap rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-400/20 disabled:cursor-wait disabled:opacity-60"
                            >
                              {updatingId === entry.id ? "Updating..." : "Received by Worker"}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-right text-[11px] text-zinc-500">Latest cloud records first</p>
            </>
          )}
        </div>
      )}

      {!customer && (isLoadingDirectory ? (
        <div className="mt-5 animate-pulse space-y-3" aria-label="Loading customer directory">
          <div className="h-16 rounded-xl bg-zinc-800/70" />
          <div className="h-16 rounded-xl bg-zinc-800/50" />
          <div className="h-16 rounded-xl bg-zinc-800/40" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 text-center text-sm text-zinc-400">
          {searchQuery.trim() ? "No customers match that name or phone number." : "No customers with ledger records yet."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 transition-opacity duration-200">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] gap-4 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 text-[10px] font-semibold uppercase text-zinc-500 sm:grid">
            <span>Customer</span>
            <span>Phone</span>
            <span>Last Transaction</span>
            <span className="text-right">Overall Balance</span>
          </div>
          <ul className="divide-y divide-zinc-800/80">
          {filteredCustomers.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void openCustomerById(item.id)}
                className="grid w-full grid-cols-1 gap-2 px-4 py-4 text-left transition-colors hover:bg-zinc-800/50 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <span className="truncate font-semibold text-white">{item.name}</span>
                <span className="font-mono text-xs text-zinc-400">{item.phone_number || "No phone number"}</span>
                <span className="text-xs text-zinc-400">{item.latest_transaction_at ? new Date(item.latest_transaction_at).toLocaleString() : "Unknown date"}</span>
                <span className="text-sm font-semibold text-amber-300 sm:text-right">
                  Rs. {item.total_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </button>
            </li>
          ))}
          </ul>
        </div>
      ))}
    </section>
  );
}