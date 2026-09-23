"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export interface RealtimePayloadInfo {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  newRecord: Record<string, any>;
  oldRecord: Record<string, any>;
  timestamp: string;
}

interface UseRealtimeSyncOptions {
  tables?: string[];
  autoRefresh?: boolean;
  onPayload?: (info: RealtimePayloadInfo) => void;
  debounceMs?: number;
}

const DEFAULT_TARGET_TABLES = [
  "shifts",
  "expenses",
  "ledger_transactions",
  "transactions",
  "inventory_arrivals",
];

/**
 * Custom React Hook to subscribe to Supabase Realtime Postgres Changes
 * for Owner/Admin Dashboard updates.
 *
 * Subscribes to INSERT and UPDATE events on target tables, calls router.refresh()
 * to revalidate Server Components without full reload, and cleans up the channel on unmount.
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const {
    tables = DEFAULT_TARGET_TABLES,
    autoRefresh = true,
    onPayload,
    debounceMs = 300,
  } = options;

  const router = useRouter();
  const [status, setStatus] = useState<RealtimeStatus>("CONNECTING");
  const [lastPayload, setLastPayload] = useState<RealtimePayloadInfo | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  const triggerRevalidation = useCallback(() => {
    if (!autoRefresh) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        router.refresh();
      } catch (err) {
        console.warn("router.refresh failed in realtime sync:", err);
      }
    }, debounceMs);
  }, [autoRefresh, debounceMs, router]);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `owner-realtime-sync-${Date.now()}`;
    let channel: RealtimeChannel | null = null;

    setStatus("CONNECTING");

    try {
      channel = supabase.channel(channelName);

      // Subscribe to each target table for postgres_changes
      tables.forEach((table) => {
        channel = channel!.on(
          "postgres_changes" as any,
          {
            event: "*", // captures INSERT, UPDATE, DELETE
            schema: "public",
            table,
          },
          (payload: any) => {
            const info: RealtimePayloadInfo = {
              table,
              eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
              newRecord: payload.new || {},
              oldRecord: payload.old || {},
              timestamp: new Date().toISOString(),
            };

            setLastPayload(info);

            if (onPayloadRef.current) {
              onPayloadRef.current(info);
            }

            triggerRevalidation();
          }
        );
      });

      channel.subscribe((subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          setStatus("CONNECTED");
        } else if (subStatus === "CLOSED") {
          setStatus("DISCONNECTED");
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          setStatus("ERROR");
        }
      });
    } catch (err) {
      console.error("Failed to establish Supabase Realtime channel:", err);
      setStatus("ERROR");
    }

    // Cleanup: Strictly remove channel on unmount to prevent memory leaks
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [tables, triggerRevalidation]);

  return {
    status,
    isConnected: status === "CONNECTED",
    lastPayload,
  };
}
