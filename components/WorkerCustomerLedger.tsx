"use client";

import { FormEvent, useState, useTransition } from "react";
import {
  CustomerLedgerEntry,
  getCustomerLedgerByPhone,
  markLedgerPaymentReceived,
} from "@/actions/khata-actions";

interface CustomerLedger {
  id: string;
  name: string;
  phone_number: string;
  total_balance: number;
}

export default function WorkerCustomerLedger() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customer, setCustomer] = useState<CustomerLedger | null>(null);
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [totalLiters, setTotalLiters] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function searchLedger(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setHasSearched(true);
    startTransition(async () => {
      const result = await getCustomerLedgerByPhone(phoneNumber);
      if (!result.success) {
        setCustomer(null);
        setEntries([]);
        setError(result.error || "Unable to load this customer ledger.");
        return;
      }
      setCustomer(result.customer || null);
      setEntries(result.entries || []);
      setTotalLiters(result.total_liters || 0);
    });
  }

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

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-white">Customer Ledger</h2>
        <p className="mt-1 text-xs text-zinc-400">Search cloud records by customer phone number</p>
      </div>

      <form onSubmit={searchLedger} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="ledger-phone-search">Customer phone number</label>
        <input
          id="ledger-phone-search"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          placeholder="Enter customer phone number"
          className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending && !updatingId ? "Searching..." : "Search Ledger"}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {isPending && !updatingId && (
        <div className="mt-5 animate-pulse space-y-3" aria-label="Loading ledger">
          <div className="h-20 rounded-xl bg-zinc-800/70" />
          <div className="h-24 rounded-xl bg-zinc-800/50" />
        </div>
      )}

      {!isPending && hasSearched && !customer && !error && (
        <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 text-center text-sm text-zinc-400">
          No customer found for that phone number.
        </p>
      )}

      {customer && (
        <div className="mt-5 space-y-4">
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
        </div>
      )}
    </section>
  );
}