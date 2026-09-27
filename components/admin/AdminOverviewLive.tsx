"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MeterReadingsHistory from "@/components/MeterReadingsHistory";
import AdminOverviewStats from "@/components/admin/AdminOverviewStats";
import AdminShiftReconciliations from "@/components/admin/AdminShiftReconciliations";
import { type OverviewStats } from "@/actions/admin-actions";
import { useRealtimeSync, type RealtimePayloadInfo } from "@/lib/hooks/useRealtimeSync";

interface AdminOverviewLiveProps {
  initialData: OverviewStats;
  view?: "overview" | "meter-readings";
}

export default function AdminOverviewLive({ initialData, view = "overview" }: AdminOverviewLiveProps) {
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {view === "overview" ? "Station Overview" : "Meter Readings Audit"}
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
            {view === "overview"
              ? "Live performance and cash reconciliation across your station."
              : "Uploaded meter readings, shift reconciliation, liters dispensed, and cash totals."}
            <span suppressHydrationWarning className="ml-2 text-xs text-zinc-500 font-mono">
              Last update: {lastSyncTime}
            </span>
          </p>
        </div>

        {view === "overview" && <div className="flex items-center gap-3">
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
        </div>}
      </div>

      {view === "overview" ? (
        <AdminOverviewStats data={data} />
      ) : (
        <>
          <AdminShiftReconciliations
            shifts={data.recentShifts}
            highlightedShiftId={highlightedShiftId}
          />
          <MeterReadingsHistory limit={100} />
        </>
      )}
    </div>
  );
}
