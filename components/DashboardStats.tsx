"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";

export default function DashboardStats() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dexie live queries for pending sales, pending expenses, and active shift
  const pendingSales = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.pendingSales.where("sync_status").equals("pending").toArray();
    },
    [],
    []
  );

  const pendingExpenses = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.pendingExpenses.where("sync_status").equals("pending").toArray();
    },
    [],
    []
  );

  const activeShift = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return null;
      return await db.shifts.where("status").equals("active").first();
    },
    [],
    null
  );

  const pendingSalesCount = pendingSales ? pendingSales.length : 0;
  const pendingSalesLiters = pendingSales
    ? pendingSales.reduce((acc, sale) => acc + (sale.total_liters || 0), 0)
    : 0;

  const pendingExpensesCount = pendingExpenses ? pendingExpenses.length : 0;
  const pendingExpensesTotal = pendingExpenses
    ? pendingExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0)
    : 0;

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
        <div className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
        <div className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Stat Card 1: Offline Sales Pending */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Offline Sales Pending
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
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
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white">
            {pendingSalesCount}{" "}
            <span className="text-xs font-normal text-zinc-400">
              {pendingSalesCount === 1 ? "record" : "records"}
            </span>
          </div>
          <p className="text-xs text-emerald-400 mt-1">
            {pendingSalesLiters.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 2,
            })}{" "}
            Liters unsynced in Dexie
          </p>
        </div>
      </div>

      {/* Stat Card 2: Offline Expenses Pending */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Offline Expenses Pending
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
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
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
              />
            </svg>
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white">
            Rs.{" "}
            {pendingExpensesTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-amber-400 mt-1">
            {pendingExpensesCount}{" "}
            {pendingExpensesCount === 1 ? "expense record" : "expense records"} pending
          </p>
        </div>
      </div>

      {/* Stat Card 3: Active Shift Status */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Active Shift Status
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              activeShift
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            {activeShift ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Shift
              </>
            ) : (
              <span className="text-amber-400">No Shift Active</span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1 truncate">
            {activeShift
              ? `Started: ${new Date(activeShift.start_time).toLocaleTimeString()}`
              : "Start a shift to link sales & expenses"}
          </p>
        </div>
      </div>
    </div>
  );
}
