import type { TankerDeliveryLog } from "@/actions/inventory-logs-actions";

interface Props {
  logs: TankerDeliveryLog[];
}

function formatDatetime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function VarianceBadge({
  billed,
  actual,
}: {
  billed: number;
  actual: number;
}) {
  const diff = actual - billed;
  const pct = billed > 0 ? ((diff / billed) * 100).toFixed(1) : "0.0";
  if (diff === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
        Exact
      </span>
    );
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        diff < 0
          ? "bg-rose-500/15 text-rose-400"
          : "bg-emerald-500/15 text-emerald-400"
      }`}
    >
      {diff > 0 ? "+" : ""}
      {diff.toFixed(1)} L ({diff > 0 ? "+" : ""}
      {pct}%)
    </span>
  );
}

export default function TankerDeliveryLogs({ logs }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Recent Tanker Deliveries
            </h2>
            <p className="text-xs text-zinc-400">
              Tanker arrival logs submitted by workers — last 50 entries
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/70 px-3 py-1 text-xs text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {logs.length} record{logs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty State */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60">
            <svg
              className="h-7 w-7 text-zinc-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">
            No delivery logs yet
          </p>
          <p className="text-xs text-zinc-600">
            Tanker arrivals logged by workers will appear here after sync.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-950/40">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Date &amp; Time
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Received By
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Fuel Product
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Billed (L)
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Actual (L)
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Variance
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Cost / L
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {logs.map((log, idx) => {
                const { date, time } = formatDatetime(log.created_at);
                const totalCost = log.billed_liters * log.cost_per_liter;
                return (
                  <tr
                    key={log.id}
                    className={`group transition-colors hover:bg-zinc-800/30 ${
                      idx % 2 === 0
                        ? "bg-transparent"
                        : "bg-zinc-950/20"
                    }`}
                  >
                    {/* Date & Time */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-zinc-200">
                          {date}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {time}
                        </span>
                      </div>
                    </td>

                    {/* Worker */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[11px] font-bold text-indigo-400 uppercase">
                          {log.received_by_worker_name.charAt(0)}
                        </div>
                        <span className="font-medium text-zinc-200">
                          {log.received_by_worker_name}
                        </span>
                      </div>
                    </td>

                    {/* Fuel Product */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {log.product_name}
                      </span>
                    </td>

                    {/* Billed Liters */}
                    <td className="px-5 py-4 text-right font-mono text-zinc-300">
                      {log.billed_liters.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Actual Liters */}
                    <td className="px-5 py-4 text-right font-mono text-zinc-300">
                      {log.actual_received_liters.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Variance Badge */}
                    <td className="px-5 py-4 text-center">
                      <VarianceBadge
                        billed={log.billed_liters}
                        actual={log.actual_received_liters}
                      />
                    </td>

                    {/* Cost Per Liter */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono font-semibold text-zinc-100">
                          PKR{" "}
                          {log.cost_per_liter.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          Total: PKR{" "}
                          {totalCost.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
