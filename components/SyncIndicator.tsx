"use client";

import { useEffect, useState, useCallback } from "react";
import {
  processOfflineQueue,
  getPendingCount,
} from "@/lib/services/sync-service";

export default function SyncIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await processOfflineQueue();
      setPendingCount(result.pendingRemainingCount);
      if (!result.success && result.error) {
        console.error("SYNC FAILED:", result.error);
        setSyncError(result.error);
      }
    } catch (err: unknown) {
      console.error("SYNC FAILED:", err);
      setSyncError("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const initialOnlineState =
      typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(initialOnlineState);

    const initMountSync = async () => {
      const count = await getPendingCount();
      setPendingCount(count);

      // If online on mount and pending records exist, sync immediately
      if (initialOnlineState && count > 0) {
        await triggerSync();
      }
    };

    initMountSync();

    const handleOnline = async () => {
      setIsOnline(true);
      await refreshPendingCount();
      await triggerSync();
    };

    const handleOffline = async () => {
      setIsOnline(false);
      await refreshPendingCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync, refreshPendingCount]);

  if (isSyncing) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span>Syncing...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
        <span>
          Offline {pendingCount > 0 ? `- Caching (${pendingCount})` : "- Caching"}
        </span>
      </div>
    );
  }

  if (syncError) {
    return (
      <button
        onClick={triggerSync}
        className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-colors shadow-xs cursor-pointer"
        title={syncError}
      >
        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
        <span>Sync Error (Retry)</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>
        {pendingCount > 0 ? `Online (${pendingCount} pending)` : "Online"}
      </span>
    </div>
  );
}
