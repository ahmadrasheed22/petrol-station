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
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryDelayRef = useRef(1000);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  const triggerRevalidation = useCallback(() => {
    if (!autoRefresh) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        router.refresh();
      } catch (err) {
        console.warn("router.refresh failed in realtime sync:", err);
      }
    }, debounceMs);
  }, [autoRefresh, debounceMs, router]);

  const tablesKey = tables.join(",");

  useEffect(() => {
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    if (isOffline) {
      setStatus("DISCONNECTED");
      return;
    }

    const connect = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("DISCONNECTED");
        return;
      }

      const supabase = createClient();
      const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 9);
      const channelName = `owner-realtime-${uniqueId}-${Date.now()}`;

      const channel = supabase.channel(channelName);
      channelRef.current = channel;

      setStatus("CONNECTING");

      tables.forEach((table) => {
        channel.on(
          "postgres_changes" as any,
          {
            event: "*",
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
          if (typeof navigator !== "undefined" && navigator.onLine) {
            const delay = retryDelayRef.current;
            retryDelayRef.current = Math.min(retryDelayRef.current * 2, 5000);

            if (retryTimerRef.current) {
              clearTimeout(retryTimerRef.current);
            }
            retryTimerRef.current = setTimeout(() => {
              if (typeof navigator !== "undefined" && navigator.onLine) {
                connect();
              }
            }, delay);
          }
        }
      });
    };

    const handleOnline = () => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        retryDelayRef.current = 1000;
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        connect();
      }
    };

    const supabase = createClient();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    connect();
    window.addEventListener("online", handleOnline);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      window.removeEventListener("online", handleOnline);
    };
  }, [tablesKey, triggerRevalidation]);

  return {
    status,
    isConnected: status === "CONNECTED",
    lastPayload,
  };
}
