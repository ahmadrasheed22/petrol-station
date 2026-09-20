"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { type PendingSale } from "@/lib/offline-db";
import {
  addDummySale,
  clearPendingSales,
  fetchPendingSales,
} from "@/lib/services/offline-service";

export default function OfflineTestPage() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Live query from Dexie IndexedDB via service function
  const pendingSales = useLiveQuery(fetchPendingSales);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleAddDummySale = async () => {
    try {
      await addDummySale();
    } catch (error) {
      console.error("Failed to add dummy sale:", error);
    }
  };

  const handleClearData = async () => {
    try {
      await clearPendingSales();
    } catch (error) {
      console.error("Failed to clear pending sales:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Offline Testing Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Test IndexedDB persistence (Dexie.js) and Service Worker offline behavior.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 self-start md:self-auto">
            <span className="text-sm font-medium text-slate-300">Network Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isOnline
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddDummySale}
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
            >
              + Add Dummy Sale
            </button>

            <button
              onClick={handleClearData}
              className="inline-flex items-center justify-center bg-rose-600/10 border border-rose-600/30 hover:bg-rose-600/20 text-rose-400 font-medium text-sm px-5 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
            >
              Clear Data
            </button>
          </div>

          <div className="text-sm text-slate-400">
            Records in DB:{" "}
            <span className="font-semibold text-slate-200">
              {pendingSales ? pendingSales.length : 0}
            </span>
          </div>
        </div>

        {/* Live Query Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Pending Sales Table (<code className="text-xs text-blue-400">db.pendingSales</code>)
            </h2>
            <span className="text-xs text-slate-400">Reactive Live View</span>
          </div>

          {!pendingSales ? (
            <div className="p-8 text-center text-slate-400">Loading IndexedDB records...</div>
          ) : pendingSales.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <svg
                className="w-10 h-10 text-slate-600 mb-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="font-medium text-slate-300">No pending sales in local database.</p>
              <p className="text-xs text-slate-500">
                Click "Add Dummy Sale" above to test inserting data into Dexie.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">ID</th>
                    <th className="px-6 py-3.5 font-medium">Shift ID</th>
                    <th className="px-6 py-3.5 font-medium">Product</th>
                    <th className="px-6 py-3.5 font-medium">Meters (Open / Close)</th>
                    <th className="px-6 py-3.5 font-medium">Liters</th>
                    <th className="px-6 py-3.5 font-medium">Applied SP</th>
                    <th className="px-6 py-3.5 font-medium">Applied CP</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pendingSales.map((sale: PendingSale) => (
                    <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">#{sale.id}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {sale.shift_id || "-"}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">{sale.product_id}</td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {sale.opening_meter} → {sale.closing_meter}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-100">
                        {sale.total_liters} L
                      </td>
                      <td className="px-6 py-4">Rs. {sale.applied_sp}</td>
                      <td className="px-6 py-4">Rs. {sale.applied_cp}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {sale.sync_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {new Date(sale.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
