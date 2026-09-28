"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getCustomerDirectory,
  getCustomerLedgerById,
  getCustomerLedgerByPhone,
  markLedgerPaymentReceived,
  type CustomerDirectoryEntry,
  type CustomerLedgerEntry,
} from "@/actions/khata-actions";

export default function WorkerCustomerLedger({
  newSaleCustomer,
}: {
  newSaleCustomer?: { name: string; phoneNumber: string; sequence: number } | null;
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

  async function refreshDirectory() {
    setIsLoadingDirectory(true);
    setError("");
    const result = await getCustomerDirectory();
    if (!result.success) {
      setError(result.error || "Unable to load the customer directory.");
      setIsLoadingDirectory(false);
      return;
    }
    setCustomers(result.customers || []);
    setIsLoadingDirectory(false);
  }

  useEffect(() => {
    let active = true;
    getCustomerDirectory().then((result) => {
      if (!active) return;
      if (!result.success) {
        setError(result.error || "Unable to load the customer directory.");
      } else {
        setCustomers(result.customers || []);
      }
      setIsLoadingDirectory(false);
    }).catch(() => {
      if (!active) return;
      setError("Unable to load the customer directory.");
      setIsLoadingDirectory(false);
    });

    return () => {
      active = false;
    };
  }, []);

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
    if (!newSaleCustomer) return;

    const saleCustomer = newSaleCustomer;
    async function openLatestSaleLedger() {
      const result = await getCustomerLedgerByPhone(saleCustomer.phoneNumber);
      setSearchQuery(saleCustomer.phoneNumber);
      setEntries([]);
      setTotalLiters(0);
      setError("");
      if (!result.success) {
        setCustomer({
          id: "",
          name: saleCustomer.name,
          phone_number: saleCustomer.phoneNumber,
          total_balance: 0,
        });
        setError(result.error || "Unable to load the latest customer ledger.");
        setIsLoadingDetail(false);
        return;
      }
      if (!result.customer) {
        setCustomer({
          id: "",
          name: saleCustomer.name,
          phone_number: saleCustomer.phoneNumber,
          total_balance: 0,
        });
        setError("The sale is saved. Its cloud ledger will appear after synchronization.");
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

    void openLatestSaleLedger();
  }, [newSaleCustomer]);

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
        entry.id === entryId ? { ...entry, status: "PENDING_APPROVAL" } : entry
      ));
      setUpdatingId(null);
    });
  }

  const filteredCustomers = customers.filter((item) => {
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
                          <p className="mt-1 text-xs text-zinc-500">
                            {new Date(entry.created_at).toLocaleString()} {entry.liters > 0 ? `· ${entry.liters.toLocaleString()} L` : ""}
                          </p>
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
        <ul className="divide-y divide-zinc-800/80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 transition-opacity duration-200">
          {filteredCustomers.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void openCustomerById(item.id)}
                className="grid w-full grid-cols-1 gap-2 px-4 py-4 text-left transition-colors hover:bg-zinc-800/50 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] sm:items-center sm:gap-4"
              >
                <span className="truncate font-semibold text-white">{item.name}</span>
                <span className="font-mono text-xs text-zinc-400">{item.phone_number || "No phone number"}</span>
                <span className="text-sm font-semibold text-amber-300 sm:text-right">
                  Rs. {item.total_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
}