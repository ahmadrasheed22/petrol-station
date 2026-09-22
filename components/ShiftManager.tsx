"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";
import { startShift, endShift } from "@/lib/services/offline-service";

interface ShiftManagerProps {
  userId: string;
}

export default function ShiftManager({ userId }: ShiftManagerProps) {
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Hydration safeguard for SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reactive IndexedDB query for active shift
  const activeShift = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return null;
      return await db.shifts.where("status").equals("active").first();
    },
    [],
    null
  );

  const handleStartShift = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const newShift = await startShift(userId);
      setActionMessage(`Shift started successfully! ID: ${newShift.shift_id}`);
    } catch (err: unknown) {
      console.error("Failed to start shift:", err);
      setActionMessage("Error starting shift in Dexie.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift?.id) return;
    setIsProcessing(true);
    setActionMessage(null);
    try {
      await endShift(activeShift.id);
      setActionMessage("Shift ended successfully.");
    } catch (err: unknown) {
      console.error("Failed to end shift:", err);
      setActionMessage("Error ending shift in Dexie.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl animate-pulse">
        <div className="h-6 w-36 bg-zinc-800 rounded mb-4" />
        <div className="h-10 w-full bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-6">
      <div>
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Shift Manager</h2>
              <p className="text-xs text-zinc-400">Worker Shift & Session Tracker</p>
            </div>
          </div>

          {activeShift ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Shift
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              No Active Shift
            </div>
          )}
        </div>

        {/* Shift Details Box */}
        {activeShift ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Shift ID:</span>
              <span className="font-mono text-emerald-400 font-medium">
                {activeShift.shift_id}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Worker ID:</span>
              <span className="font-mono text-zinc-200">{activeShift.user_id}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Started At:</span>
              <span className="text-zinc-200">
                {new Date(activeShift.start_time).toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-center space-y-1">
            <p className="text-sm font-medium text-zinc-300">
              No shift currently open
            </p>
            <p className="text-xs text-zinc-500">
              Click &quot;Start Shift&quot; to begin recording sales for your shift.
            </p>
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
          {actionMessage}
        </div>
      )}

      {/* Action Controls */}
      <div>
        {activeShift ? (
          <button
            onClick={handleEndShift}
            disabled={isProcessing}
            className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/40 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? "Ending Shift..." : "End Active Shift"}
          </button>
        ) : (
          <button
            onClick={handleStartShift}
            disabled={isProcessing}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? "Starting Shift..." : "Start Shift"}
          </button>
        )}
      </div>
    </div>
  );
}
