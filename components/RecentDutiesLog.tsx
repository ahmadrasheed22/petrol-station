import type { ShiftRecord } from "@/lib/offline-db";

interface RecentDutiesLogProps {
  duties: ShiftRecord[];
}

export default function RecentDutiesLog({ duties }: RecentDutiesLogProps) {
  return (
    <div className="border-t border-zinc-800/80 pt-4">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2.5">
        <span className="font-semibold text-zinc-300">Recent Completed Duties</span>
        <span className="text-[11px] text-zinc-500">Local Dexie Log</span>
      </div>
      <div className="space-y-2">
        {duties.map((duty) => {
          const diff = duty.shortage_amount ?? 0;
          return (
            <div
              key={duty.shift_id}
              className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{duty.product_name || "Fuel"}</span>
                  <span className="text-zinc-500 font-mono text-[11px]">
                    Meters: {duty.opening_meter?.toLocaleString() ?? 0} &rarr; {duty.closing_meter?.toLocaleString() ?? 0}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Sold: <span className="font-mono text-zinc-200">{duty.total_liters?.toFixed(2) ?? "0.00"}L</span> | Rate: Rs. {duty.price_per_liter ?? 0}/L
                </div>
              </div>

              <div className="flex items-center gap-3 sm:text-right">
                <div>
                  <div className="font-mono text-zinc-200 font-medium">
                    Expected: Rs. {duty.expected_cash?.toLocaleString() ?? 0}
                  </div>
                  <div className="font-mono text-zinc-400 text-[11px]">
                    Drawer: Rs. {duty.actual_cash?.toLocaleString() ?? 0}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    diff === 0
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : diff < 0
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  }`}
                >
                  {diff === 0
                    ? "Balanced"
                    : diff < 0
                    ? `-Rs. ${Math.abs(diff).toLocaleString()}`
                    : `+Rs. ${diff.toLocaleString()}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}