"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getCustomerDirectory,
  type CustomerDirectoryEntry,
  type CustomerLedgerEntry,
  type WorkerPendingCollection,
} from "@/actions/khata-actions";
import { db, type PendingLedgerTransaction } from "@/lib/offline-db";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import {
  markReceivedLocally,
  purgeSettledLedgerTransaction,
  reconcileOfflineCustomersWithCloud,
} from "@/lib/services/offline-ledger-service";
import { formatSouthAsianAmountInWords } from "@/lib/utils/number-to-words";

function getCustomerKey(name: string, phoneNumber: string): string {
  const normalizedPhone = phoneNumber.trim();
  return normalizedPhone
    ? `phone:${normalizedPhone}`
    : `name:${name.trim().toLocaleLowerCase()}`;
}

export default function WorkerCustomerLedger({
  refreshKey = 0,
  workerName,
}: {
  refreshKey?: number;
  workerName: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerDirectoryEntry[]>([]);
  const [directoryTab, setDirectoryTab] = useState<"all" | "pending">("all");
  const [customer, setCustomer] = useState<CustomerDirectoryEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const directoryRequestRef = useRef(0);
  const offlineDirectory = useLiveQuery(
    async () => {
      const [offlineCustomers, ledgerTransactions] = await Promise.all([
        db.customers.toArray(),
        db.pendingLedgerTransactions.toArray(),
      ]);
      return { offlineCustomers, ledgerTransactions };
    },
    [],
    { offlineCustomers: [], ledgerTransactions: [] }
  );

  const refreshDirectory = useCallback(async () => {
    const requestId = ++directoryRequestRef.current;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (requestId === directoryRequestRef.current) setIsLoadingDirectory(false);
      return;
    }

    try {
      const directoryResult = await getCustomerDirectory();
      if (requestId !== directoryRequestRef.current) return;

      if (!directoryResult.success) {
        setError(directoryResult.error || "Unable to load the customer directory.");
      } else {
        setError(null);
        const cloudCustomers = directoryResult.customers || [];
        await reconcileOfflineCustomersWithCloud(
          directoryResult.sync_customers || cloudCustomers,
          directoryResult.ledger_sync_entries || []
        );
        setCustomers(cloudCustomers);
      }

    } catch (error) {
      console.warn("Worker directory refresh skipped after a network failure:", error);
    }
    if (requestId === directoryRequestRef.current) setIsLoadingDirectory(false);
  }, []);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory, refreshKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshDirectory();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refreshDirectory]);

  useRealtimeSync({
    tables: ["ledger_transactions"],
    onPayload: (payload) => {
      if (payload.eventType === "UPDATE" && payload.newRecord.status === "SETTLED") {
        void purgeSettledLedgerTransaction(
          typeof payload.newRecord.id === "string" ? payload.newRecord.id : undefined,
          typeof payload.newRecord.client_id === "string" ? payload.newRecord.client_id : undefined
        );
      }
      void refreshDirectory();
    },
  });

  async function openCustomerById(customerId: string) {
    const targetCustomer = directoryCustomers.find((item) => item.id === customerId) || null;

    setError(null);
    setCustomer(targetCustomer);
    if (!targetCustomer) return;
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
      };
      group.transactions.push(transaction);
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
      const latestLocalTransactionEntry = group.transactions.reduce(
        (latest, transaction) => transaction.created_at > latest.created_at ? transaction : latest,
        group.transactions[0]
      );

      if (existing && cloudKey) {
        const pendingDelta = group.transactions.reduce((total, transaction) => {
          if (transaction.sync_status !== "pending") return total;
          return total + (transaction.transaction_type === "credit" ? transaction.amount : -transaction.amount);
        }, 0);
        merged.set(cloudKey, {
          ...existing,
          total_balance: existing.total_balance + pendingDelta,
          has_pending_approval: existing.has_pending_approval || group.transactions.some((transaction) => transaction.status === "PENDING_APPROVAL"),
          latest_transaction_at:
            latestLocalTransaction > existing.latest_transaction_at
              ? latestLocalTransaction
              : existing.latest_transaction_at,
        });
        continue;
      }

      const totalBalance = group.transactions.reduce(
        (total, transaction) => transaction.status === "SETTLED"
          ? total
          : total + (transaction.transaction_type === "credit" ? transaction.amount : -transaction.amount),
        0
      );
      merged.set(key, {
        id: group.transactions[0].customer_id || `offline:${key}`,
        name: group.name,
        phone_number: group.phoneNumber,
        liters: latestLocalTransactionEntry?.liters || 0,
        latest_fuel_product: latestLocalTransactionEntry?.fuel_product || null,
        latest_price_per_liter: latestLocalTransactionEntry?.price_per_liter || latestLocalTransactionEntry?.applied_sp || 0,
        total_balance: totalBalance,
        has_pending_approval: group.transactions.some((transaction) => transaction.status === "PENDING_APPROVAL"),
        latest_transaction_at: latestLocalTransaction,
      });
    }

    return Array.from(merged.values()).sort((first, second) =>
      second.latest_transaction_at.localeCompare(first.latest_transaction_at)
    );
  }, [customers, offlineDirectory]);

  function toLocalLedgerEntry(transaction: PendingLedgerTransaction): CustomerLedgerEntry {
    return {
      id: `offline:${transaction.id}`,
      cloud_id: transaction.cloud_id,
      customer_name: transaction.customer_name,
      fuel_product: transaction.fuel_product || null,
      price_per_liter: transaction.price_per_liter || transaction.applied_sp || 0,
      liters: transaction.liters || 0,
      amount: transaction.amount,
      applied_sp: transaction.applied_sp || transaction.price_per_liter || 0,
      transaction_type: transaction.transaction_type,
      status: transaction.status,
      created_at: transaction.created_at,
      received_at: transaction.received_at || null,
      issued_by_worker_name: transaction.issued_by_worker_name || "Unknown Worker",
      received_by_worker_name: transaction.received_by_worker_name || null,
    };
  }

  const detailEntries = useMemo(() => {
    if (!customer) return [];
    const localEntries = (offlineDirectory?.ledgerTransactions || [])
      .filter((transaction) => {
        const sameCustomer = transaction.customer_id === customer.id ||
          (transaction.customer_name.trim().toLocaleLowerCase() === customer.name.trim().toLocaleLowerCase() &&
            (!transaction.phone_number || !customer.phone_number || transaction.phone_number === customer.phone_number));
        return sameCustomer && transaction.status !== "SETTLED";
      })
      .map(toLocalLedgerEntry);

    return localEntries.sort((first, second) => second.created_at.localeCompare(first.created_at));
  }, [customer, offlineDirectory]);

  const pendingCollections = useMemo<WorkerPendingCollection[]>(() => {
    const merged = new Map<string, WorkerPendingCollection>();

    for (const transaction of offlineDirectory?.ledgerTransactions || []) {
      if (transaction.status !== "PENDING_APPROVAL") continue;

      const localKey = transaction.client_id;
      const localEntry: WorkerPendingCollection = {
        id: transaction.cloud_id || `offline:${transaction.id}`,
        client_id: localKey,
        customer_id: transaction.customer_id || `offline:${localKey}`,
        customer_name: transaction.customer_name,
        amount: transaction.amount,
        created_at: transaction.created_at,
      };
      merged.set(localKey, localEntry);
    }

    return Array.from(merged.values()).sort((first, second) =>
      second.created_at.localeCompare(first.created_at)
    );
  }, [offlineDirectory]);

  const totalLiters = detailEntries.reduce(
    (total, entry) => total + (entry.transaction_type === "credit" ? entry.liters : 0),
    0
  );

  async function markReceived(entryId: string) {
    if (loadingIds.has(entryId)) return;
    setError(null);
    setLoadingIds((current) => new Set(current).add(entryId));
    try {
      let updated = false;
      const localId = Number(entryId.replace(/^offline:/, ""));
      updated = Number.isInteger(localId) && await markReceivedLocally(localId, workerName);

      if (!updated) return;
      void refreshDirectory();
    } finally {
      setLoadingIds((current) => {
        const next = new Set(current);
        next.delete(entryId);
        return next;
      });
    }
  }

  const filteredCustomers = directoryCustomers.filter((item) => {
    if (!(Number(item.total_balance) > 0)) return false;
    const query = searchQuery.trim().toLocaleLowerCase();
    return !query || item.name.toLocaleLowerCase().includes(query) ||
      item.phone_number.toLocaleLowerCase().includes(query);
  });
  const filteredPendingCollections = pendingCollections.filter((item) => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return !query || item.customer_name.toLocaleLowerCase().includes(query);
  });
  const allCustomersTotal = directoryCustomers.reduce((total, item) => total + Math.max(Number(item.total_balance) || 0, 0), 0);
  const pendingApprovalsTotal = pendingCollections.reduce((total, item) => total + (Number(item.amount) || 0), 0);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl sm:p-6">
      {customer ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Customer Ledger</h2>
            <p className="mt-1 text-xs text-zinc-400">Transaction history</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCustomer(null);
              setError(null);
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
        <div>
          <div className="mb-4 flex rounded-xl border border-zinc-800 bg-zinc-950/70 p-1">
            <button type="button" onClick={() => setDirectoryTab("all")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${directoryTab === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}>All Customers (Rs. {allCustomersTotal.toLocaleString()})</button>
            <button type="button" onClick={() => setDirectoryTab("pending")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${directoryTab === "pending" ? "bg-amber-500/15 text-amber-200" : "text-zinc-400 hover:text-white"}`}>Pending Approvals (Rs. {pendingApprovalsTotal.toLocaleString()})</button>
          </div>
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
        </div>
      )}

      {customer && (
        <div className="space-y-4 transition-opacity duration-200">
          <>
              <div className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold text-white">{customer.name}</h3>
                  <p className="mt-1 font-mono text-xs text-zinc-400">{customer.phone_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <p className="text-[10px] uppercase text-zinc-400">Total Liters</p>
                    <p className="mt-1 text-lg font-bold text-emerald-300">
                      {totalLiters === null ? "--" : totalLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <p className="text-[10px] uppercase text-zinc-400">Amount Due</p>
                    <p className="mt-1 text-lg font-bold text-amber-300">Rs. {customer.total_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">{formatSouthAsianAmountInWords(customer.total_balance)}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
                {detailEntries.length === 0 ? (
                  <p className="p-6 text-center text-sm text-zinc-500">No ledger transactions for this customer.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/80">
                    {detailEntries.map((entry) => (
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
                          <p className="mt-2 text-xs text-zinc-400">
                            Issued: <span className="text-zinc-300">{new Date(entry.created_at).toLocaleString()}</span>
                          </p>
                          {entry.received_at && (
                            <p className="mt-1 text-xs text-yellow-200">
                              Received: <span>{new Date(entry.received_at).toLocaleString()}</span>
                            </p>
                          )}
                          {entry.liters > 0 && (
                            <p className="mt-1 text-xs text-zinc-500">{entry.liters.toLocaleString()} L</p>
                          )}
                          <p className="mt-1 text-xs text-zinc-400">
                            {entry.fuel_product?.trim() || "Product unavailable"} · Rs. {entry.price_per_liter.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L
                          </p>
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
                            entry.cloud_id ? (
                              <button
                                type="button"
                                onClick={() => markReceived(entry.id)}
                                disabled={loadingIds.has(entry.id)}
                                className="whitespace-nowrap rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-400/20 disabled:cursor-wait disabled:opacity-60"
                              >
                                {loadingIds.has(entry.id) ? "Processing..." : "Received by Worker"}
                              </button>
                            ) : (
                              <span className="whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs font-bold text-zinc-400">
                                Syncing...
                              </span>
                            )
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-right text-[11px] text-zinc-500">Latest records first</p>
          </>
        </div>
      )}

      {!customer && (directoryTab === "pending" ? (
        filteredPendingCollections.length === 0 ? (
          <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 text-center text-sm text-zinc-400">No payments are waiting for owner approval.</p>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-amber-500/20 bg-zinc-950/40">
            <ul className="divide-y divide-zinc-800/80">
              {filteredPendingCollections.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => void openCustomerById(item.customer_id)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-zinc-800/50">
                    <span className="min-w-0"><span className="block truncate font-semibold text-white">{item.customer_name}</span><span className="mt-1 block text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</span></span>
                    <span className="whitespace-nowrap text-sm font-semibold text-amber-300">Rs. {item.amount.toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : isLoadingDirectory ? (
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
                <span className="flex min-w-0 flex-wrap items-center gap-2 font-semibold text-white">
                  <span className="truncate">{item.name}</span>
                  {item.has_pending_approval && (
                    <span className="shrink-0 rounded-full border border-yellow-400/40 bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-200">
                      Approval Pending
                    </span>
                  )}
                </span>
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