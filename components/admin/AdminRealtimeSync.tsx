"use client";

import { useState, useCallback } from "react";
import { useRealtimeSync, type RealtimePayloadInfo } from "@/lib/hooks/useRealtimeSync";

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: "shift" | "expense" | "ledger" | "sale" | "inventory";
  timestamp: string;
}

export default function AdminRealtimeSync() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const handlePayload = useCallback((info: RealtimePayloadInfo) => {
    let title = "Realtime Update";
    let message = "Cloud database synchronized";
    let type: ToastNotification["type"] = "shift";

    const { table, eventType, newRecord } = info;

    if (table === "shifts") {
      type = "shift";
      const worker = newRecord.worker_name || (newRecord.worker_id ? `Worker (${newRecord.worker_id.slice(0, 6)})` : "Worker");
      const product = newRecord.product_name || "Fuel";
      
      if (newRecord.closing_meter > 0) {
        title = "⚡ Shift Duty Reconciled";
        const shortage = Number(newRecord.shortage_amount || 0);
        const shortageText = shortage === 0 ? "Balanced" : shortage > 0 ? `-Rs. ${shortage.toLocaleString()}` : `+Rs. ${Math.abs(shortage).toLocaleString()}`;
        message = `${worker} completed duty: ${newRecord.total_liters || 0}L dispensed • Variance: ${shortageText}`;
      } else {
        title = "⚡ Shift Duty Started";
        message = `${worker} started shift for ${product} (Opening: ${Number(newRecord.opening_meter || 0).toLocaleString()})`;
      }
    } else if (table === "expenses") {
      type = "expense";
      title = "⚡ New Expense Recorded";
      const amt = Number(newRecord.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });
      const desc = newRecord.description || "Operational Expense";
      message = `Rs. ${amt} logged for "${desc}"`;
    } else if (table === "ledger_transactions") {
      type = "ledger";
      title = "⚡ Khata (Credit) Synced";
      const cust = newRecord.customer_name || "Customer";
      const amt = Number(newRecord.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });
      const txType = newRecord.transaction_type === "payment" ? "Payment Received" : "Credit (Udhar)";
      message = `${cust}: Rs. ${amt} (${txType})`;
    } else if (table === "transactions") {
      type = "sale";
      title = "⚡ Fuel Sale Synced";
      const liters = Number(newRecord.liters || 0);
      const total = Number(newRecord.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });
      message = `${liters} Liters sold (Rs. ${total})`;
    } else if (table === "inventory_arrivals") {
      type = "inventory";
      title = "⚡ Tanker Delivery Synced";
      const rcvd = Number(newRecord.actual_received_liters || 0).toLocaleString();
      message = `${rcvd} Liters bulk fuel received into tanks`;
    }

    const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastNotification = {
      id: toastId,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4500);
  }, []);

  const { isConnected } = useRealtimeSync({
    autoRefresh: true,
    onPayload: handlePayload,
  });

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {/* Toast Notifications Overlay in Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-2">
        {toasts.map((toast) => {
          const borderColor =
            toast.type === "shift"
              ? "border-emerald-500/40 bg-zinc-950/95 text-emerald-400"
              : toast.type === "expense"
              ? "border-amber-500/40 bg-zinc-950/95 text-amber-400"
              : toast.type === "ledger"
              ? "border-indigo-500/40 bg-zinc-950/95 text-indigo-400"
              : "border-blue-500/40 bg-zinc-950/95 text-blue-400";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${borderColor}`}
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white tracking-tight truncate">
                    {toast.title}
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {toast.timestamp}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-300 font-medium leading-relaxed">
                  {toast.message}
                </p>
                <p className="mt-1.5 text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                  <span>Revalidated via Supabase Realtime</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-lg p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
