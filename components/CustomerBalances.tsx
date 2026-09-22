"use client";

import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, CustomerRecord } from "@/lib/offline-db";
import { getOfflineCustomers } from "@/lib/services/offline-service";

export default function CustomerBalances() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reactive Dexie live query to observe customer records and live balance updates
  const customers = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.customers.toArray();
    },
    [],
    []
  );

  // Auto-seed or load offline customers on mount if local store is empty
  useEffect(() => {
    setMounted(true);

    async function ensureCustomers() {
      try {
        const currentCount = await db.customers.count();
        if (currentCount === 0) {
          await getOfflineCustomers();
        }
      } catch (err) {
        console.error("Failed to check offline customers in Dexie:", err);
      }
    }

    ensureCustomers();
  }, []);

  // Filtered customer list based on search query
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery.trim()) return customers;

    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.vehicle_number && c.vehicle_number.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Compute total ledger outstanding balance
  const totalOutstanding = useMemo(() => {
    if (!customers) return 0;
    return customers.reduce((sum, c) => sum + (c.total_balance > 0 ? c.total_balance : 0), 0);
  }, [customers]);

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl animate-pulse space-y-4">
        <div className="h-6 w-48 bg-zinc-800 rounded" />
        <div className="h-10 w-full bg-zinc-800/50 rounded-xl" />
        <div className="h-40 w-full bg-zinc-800/40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-6">
      <div className="space-y-4">
        {/* Header & Metric Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Customer Balances</h2>
              <p className="text-xs text-zinc-400">
                Live offline ledger balances stored in Dexie
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800/80 px-4 py-2 rounded-xl">
            <span className="text-xs text-zinc-400">Total Udhar:</span>
            <span className="text-sm font-bold text-emerald-400">
              Rs.{" "}
              {totalOutstanding.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by customer name or vehicle number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
          />
        </div>

        {/* Customer Balances List */}
        <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              {searchQuery ? "No matching customers found." : "No customers available in Dexie cache."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-medium">
                  <tr>
                    <th scope="col" className="px-4 py-3">Customer</th>
                    <th scope="col" className="px-4 py-3">Vehicle #</th>
                    <th scope="col" className="px-4 py-3 text-right">Balance</th>
                    <th scope="col" className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 font-sans">
                  {filteredCustomers.map((cust: CustomerRecord) => {
                    const hasDebt = (cust.total_balance || 0) > 0;
                    return (
                      <tr
                        key={cust.id}
                        className="hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-medium text-white">
                          {cust.name}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-400">
                          {cust.vehicle_number ? (
                            <span className="font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px] text-zinc-300">
                              {cust.vehicle_number}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold">
                          <span
                            className={
                              hasDebt ? "text-amber-400" : "text-emerald-400"
                            }
                          >
                            Rs.{" "}
                            {(cust.total_balance || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {hasDebt ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Credit Due
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
        <span>Accounts: {filteredCustomers.length} of {customers?.length || 0}</span>
        <span>Reactivity: IndexedDB Live Query</span>
      </div>
    </div>
  );
}
