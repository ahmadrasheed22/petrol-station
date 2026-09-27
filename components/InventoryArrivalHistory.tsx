import type { PendingInventory } from "@/lib/offline-db";

interface InventoryArrivalHistoryProps {
  mounted: boolean;
  arrivals: PendingInventory[] | undefined;
  getProductName: (productId: string) => string;
}

export default function InventoryArrivalHistory({
  mounted,
  arrivals,
  getProductName,
}: InventoryArrivalHistoryProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">Recent Offline Arrivals (Dexie)</h3>
        <span className="text-xs text-zinc-500">
          {arrivals ? arrivals.length : 0} records stored locally
        </span>
      </div>

      {!mounted ? (
        <div className="py-6 text-center text-xs text-zinc-500">Loading arrivals...</div>
      ) : !arrivals || arrivals.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500">
          No tanker arrivals recorded offline yet. Log a tanker above to test offline persistence.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {arrivals.map((arrival) => {
            const diff = arrival.actual_received_liters - arrival.billed_liters;
            return (
              <div
                key={arrival.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 flex items-center justify-between text-xs hover:border-zinc-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100">
                      {getProductName(arrival.product_id)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                        arrival.sync_status === "synced"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : arrival.sync_status === "failed"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      }`}
                    >
                      {arrival.sync_status}
                    </span>
                  </div>
                  <div className="text-zinc-400 text-[11px]">
                    Billed: <span className="font-mono text-zinc-300">{arrival.billed_liters.toLocaleString()}L</span> | Received: <span className="font-mono text-zinc-300">{arrival.actual_received_liters.toLocaleString()}L</span>
                    {diff !== 0 && (
                      <span className={`ml-2 font-mono ${diff < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        ({diff > 0 ? "+" : ""}{diff.toFixed(1)}L)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="font-mono text-zinc-200">PKR {arrival.cost_per_liter}/L</div>
                  <div className="text-[10px] text-zinc-500">
                    {new Date(arrival.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}