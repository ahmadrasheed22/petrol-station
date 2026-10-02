"use client";

import { useState } from "react";
import { getCustomerLedgerById, type CustomerDirectoryEntry, type CustomerLedgerEntry } from "@/actions/khata-actions";

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LedgerRows({ entries }: { entries: CustomerLedgerEntry[] }) {
  if (entries.length === 0) {
    return <p className="p-6 text-center text-sm text-zinc-500">No ledger transactions for this customer.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-800/80">
      {entries.map((entry) => (
        <li key={entry.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold capitalize text-white">{entry.transaction_type}</span>
              <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{entry.status}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{new Date(entry.created_at).toLocaleString("en-GB")}</p>
          </div>
          <div className="text-xs text-zinc-300">
            <span className="text-zinc-500">Product:</span> {entry.fuel_product || "Fuel"}
          </div>
          <div className="text-xs text-zinc-300">
            <span className="text-zinc-500">Quantity:</span> {entry.liters.toLocaleString()} L
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-zinc-400">Rs. {formatAmount(entry.price_per_liter)}/L</p>
            <p className="mt-1 font-semibold text-emerald-400">Rs. {formatAmount(entry.amount)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function CustomerLedgerHistory({ customers }: { customers: CustomerDirectoryEntry[] }) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDirectoryEntry | null>(null);
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openHistory(customer: CustomerDirectoryEntry) {
    setSelectedCustomer(customer);
    setEntries([]);
    setError(null);
    setIsLoading(true);
    const result = await getCustomerLedgerById(customer.id);
    if (!result.success) setError(result.error || "Unable to load customer history.");
    else setEntries(result.entries || []);
    setIsLoading(false);
  }

  if (selectedCustomer) {
    return (
      <section className="mt-5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4">
          <div>
            <h3 className="font-semibold text-white">{selectedCustomer.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">Transaction history</p>
          </div>
          <button type="button" onClick={() => setSelectedCustomer(null)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-emerald-500/50 hover:text-white">
            Back to Directory
          </button>
        </div>
        {error && <p className="m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
        {isLoading ? <p className="p-6 text-center text-sm text-zinc-500">Loading transaction history...</p> : <LedgerRows entries={entries} />}
      </section>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full min-w-[900px] text-left text-xs text-zinc-300">
        <thead className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Phone Number</th>
            <th className="px-4 py-3">Liters</th>
            <th className="px-4 py-3">Fuel Product</th>
            <th className="px-4 py-3">Price/L</th>
            <th className="px-4 py-3">Issued By</th>
            <th className="px-4 py-3">Latest Transaction</th>
            <th className="px-4 py-3 text-right">Outstanding Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-zinc-800/30">
              <td className="px-4 py-4">
                <button type="button" onClick={() => void openHistory(customer)} className="font-semibold text-white hover:text-emerald-300">
                  {customer.name}
                </button>
                {customer.has_pending_approval && (
                  <span className="ml-2 rounded-full border border-yellow-400/40 bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-200">
                    Approval Pending
                  </span>
                )}
              </td>
              <td className="px-4 py-4 font-mono text-zinc-400">{customer.phone_number || "Not provided"}</td>
              <td className="px-4 py-4 font-semibold text-zinc-200">{customer.liters.toLocaleString()} L</td>
              <td className="px-4 py-4 font-semibold text-zinc-200">{customer.latest_fuel_product || "Product unavailable"}</td>
              <td className="px-4 py-4 whitespace-nowrap text-zinc-300">Rs. {customer.latest_price_per_liter.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L</td>
              <td className="px-4 py-4 font-medium text-zinc-300">{customer.issued_by_worker_name || "—"}</td>
              <td className="px-4 py-4 text-zinc-400">{customer.latest_transaction_at ? new Date(customer.latest_transaction_at).toLocaleDateString("en-GB") : "No activity"}</td>
              <td className={`px-4 py-4 text-right font-bold ${customer.total_balance > 0 ? "text-amber-300" : "text-emerald-400"}`}>Rs. {customer.total_balance.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
