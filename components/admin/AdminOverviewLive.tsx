"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { type OverviewStats } from "@/actions/admin-actions";
import { useRealtimeSync, type RealtimePayloadInfo } from "@/lib/hooks/useRealtimeSync";

interface AdminOverviewLiveProps {
  initialData: OverviewStats;
}

export default function AdminOverviewLive({ initialData }: AdminOverviewLiveProps) {
  const [data, setData] = useState<OverviewStats>(initialData);
  const [highlightedShiftId, setHighlightedShiftId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  // Set initial sync time client-side only to avoid hydration mismatch
  useEffect(() => {
    setLastSyncTime(new Date().toLocaleTimeString("en-US"));
  }, []);

  // Keep state updated when router.refresh() supplies new server-rendered initialData
  useEffect(() => {
    setData(initialData);
    setLastSyncTime(new Date().toLocaleTimeString("en-US"));
  }, [initialData]);

  // Real-time listener callback
  const handleRealtimePayload = useCallback((info: RealtimePayloadInfo) => {
    const { table, eventType, newRecord } = info;
    setLastSyncTime(new Date().toLocaleTimeString("en-US"));

    if (table === "shifts" && newRecord) {
      const shiftId = newRecord.id;
      setHighlightedShiftId(shiftId);

      // Auto-clear highlight after 4 seconds
      setTimeout(() => {
        setHighlightedShiftId((current) => (current === shiftId ? null : current));
      }, 4000);

      const opening = Number(newRecord.opening_meter || 0);
      const closing = Number(newRecord.closing_meter || 0);
      const testing = Number(newRecord.testing_liters || 0);
      const totalLiters = Number(newRecord.total_liters || 0);
      const price = Number(newRecord.price_per_liter || 0);
      const expected = Number(newRecord.expected_cash || 0);
      const actual = Number(newRecord.actual_cash || 0);
      const shortage = Number(newRecord.shortage_amount || 0);

      const formattedShift = {
        id: shiftId,
        worker_id: newRecord.worker_id || "",
        worker_name:
          newRecord.worker_name ||
          (newRecord.worker_id ? `Worker (${newRecord.worker_id.slice(0, 6)})` : "Worker Attendant"),
        product_name: newRecord.product_name || "Fuel",
        start_time: newRecord.start_time || new Date().toISOString(),
        end_time: newRecord.end_time || undefined,
        opening_meter: opening,
        closing_meter: closing,
        testing_liters: testing,
        total_liters: totalLiters,
        price_per_liter: price,
        expected_cash: expected,
        actual_cash: actual,
        shortage_amount: shortage,
      };

      setData((prev) => {
        const existingIndex = prev.recentShifts.findIndex((s) => s.id === shiftId);
        let updatedList = [...prev.recentShifts];

        if (existingIndex >= 0) {
          // UPDATE event
          updatedList[existingIndex] = {
            ...updatedList[existingIndex],
            ...formattedShift,
          };
        } else {
          // INSERT event
          updatedList = [formattedShift, ...updatedList];
        }

        // Recalculate totals across recent shifts
        const totalLitersSum = updatedList.reduce((acc, s) => acc + s.total_liters, 0);
        const expectedCashSum = updatedList.reduce((acc, s) => acc + s.expected_cash, 0);
        const actualCashSum = updatedList.reduce((acc, s) => acc + s.actual_cash, 0);
        const shortageSum = updatedList.reduce((acc, s) => acc + s.shortage_amount, 0);

        return {
          ...prev,
          totalShifts: Math.max(prev.totalShifts, updatedList.length),
          todayLiters: totalLitersSum,
          todayExpectedCash: expectedCashSum,
          todayActualCash: actualCashSum,
          todayShortageAmount: shortageSum,
          recentShifts: updatedList,
        };
      });
    }
  }, []);

  const { isConnected } = useRealtimeSync({
    autoRefresh: true,
    onPayload: handleRealtimePayload,
  });

  const isShortage = data.todayShortageAmount > 0;
  const isSurplus = data.todayShortageAmount < 0;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sales & Shortages Audit
            </h1>
            {/* Live Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span>{isConnected ? "Real-Time Sync Active" : "Connecting Realtime..."}</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time reconciliation of dispenser meter readings, cash collections, and shift variances.
            <span suppressHydrationWarning className="ml-2 text-xs text-zinc-500 font-mono">
              Last update: {lastSyncTime}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/workers"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-400 transition-all hover:bg-amber-500/20 shadow-md"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New Worker</span>
          </Link>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span>Check Tanks</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liters Sold */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-lg transition-all hover:border-zinc-700">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Fuel Dispensed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {data.todayLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-zinc-400">Liters</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Across completed meter shifts</p>
        </div>

        {/* Expected Cash */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-lg transition-all hover:border-zinc-700">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Expected Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              Rs. {data.todayExpectedCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Gross sales calculated by meter</p>
        </div>

        {/* Actual Cash Handed Over */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-lg transition-all hover:border-zinc-700">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Cash Collected</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              Rs. {data.todayActualCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Physical cash turned in by staff</p>
        </div>

        {/* Net Shortage / Variance */}
        <div
          className={`rounded-2xl border p-5 backdrop-blur-md shadow-lg transition-all ${
            isShortage
              ? "border-red-500/40 bg-red-950/20"
              : isSurplus
              ? "border-emerald-500/40 bg-emerald-950/20"
              : "border-zinc-800 bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isShortage ? "Cash Shortage (Loss)" : isSurplus ? "Cash Surplus" : "Cash Variance"}
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isShortage
                  ? "bg-red-500/20 text-red-400"
                  : isSurplus
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isShortage
                      ? "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                      : "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  }
                />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                isShortage ? "text-red-400" : isSurplus ? "text-emerald-400" : "text-zinc-100"
              }`}
            >
              {isShortage ? "-" : isSurplus ? "+" : ""}Rs.{" "}
              {Math.abs(data.todayShortageAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {isShortage
              ? "Discrepancy: Workers handed over less than meter sales"
              : isSurplus
              ? "Excess cash turned in over meter calculations"
              : "Meter readings and cash perfectly balanced"}
          </p>
        </div>
      </div>

      {/* Shift Duty Reconciliation Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Recent Shift Duty Reconciliations</h2>
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                {data.recentShifts.length}
              </span>
              <span className="text-[11px] text-emerald-400/90 font-mono flex items-center gap-1 ml-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Detailed audit trail of meter opening/closing readings and worker cash submissions
            </p>
          </div>
        </div>

        {data.recentShifts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/50 text-zinc-500 mb-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-300">No shift duties logged yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              When workers complete meter-reading shifts in the terminal, reconciliation audits will show here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="pb-3 pl-2">Worker & Date</th>
                  <th className="pb-3">Product</th>
                  <th className="pb-3 text-right">Opening Meter</th>
                  <th className="pb-3 text-right">Closing Meter</th>
                  <th className="pb-3 text-right">Testing (L)</th>
                  <th className="pb-3 text-right">Net Liters</th>
                  <th className="pb-3 text-right">Expected Cash</th>
                  <th className="pb-3 text-right">Actual Handover</th>
                  <th className="pb-3 pr-2 text-right">Shortage / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.recentShifts.map((shift) => {
                  const hasShortage = shift.shortage_amount > 0;
                  const isBalanced = shift.shortage_amount === 0;
                  const isHighlighted = shift.id === highlightedShiftId;

                  return (
                    <tr
                      key={shift.id}
                      className={`transition-all duration-500 ${
                        isHighlighted
                          ? "bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/50"
                          : "hover:bg-zinc-800/20"
                      }`}
                    >
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 font-bold text-zinc-300 text-[11px]">
                            {shift.worker_name?.charAt(0) || "W"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-zinc-100">{shift.worker_name}</p>
                              {isHighlighted && (
                                <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 text-[9px] font-bold uppercase animate-pulse">
                                  Just Synced
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500">
                              {new Date(shift.start_time).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              at{" "}
                              {new Date(shift.start_time).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-zinc-200">{shift.product_name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            (@ Rs.{shift.price_per_liter})
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 text-right font-mono text-zinc-300">
                        {shift.opening_meter.toLocaleString()}
                      </td>

                      <td className="py-3.5 text-right font-mono text-zinc-300">
                        {shift.closing_meter > 0 ? shift.closing_meter.toLocaleString() : "Active"}
                      </td>

                      <td className="py-3.5 text-right font-mono text-zinc-400">
                        {shift.testing_liters > 0 ? `${shift.testing_liters} L` : "-"}
                      </td>

                      <td className="py-3.5 text-right font-mono font-bold text-emerald-400">
                        {shift.total_liters > 0 ? `${shift.total_liters.toLocaleString()} L` : "-"}
                      </td>

                      <td className="py-3.5 text-right font-mono text-zinc-300">
                        Rs. {shift.expected_cash.toLocaleString()}
                      </td>

                      <td className="py-3.5 text-right font-mono text-white font-semibold">
                        Rs. {shift.actual_cash.toLocaleString()}
                      </td>

                      <td className="py-3.5 pr-2 text-right">
                        {hasShortage ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                            -Rs. {shift.shortage_amount.toLocaleString()}
                          </span>
                        ) : isBalanced ? (
                          <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            ✓ Balanced
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            +Rs. {Math.abs(shift.shortage_amount).toLocaleString()}
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
  );
}
