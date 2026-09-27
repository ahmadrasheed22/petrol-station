import { type OverviewStats } from "@/actions/admin-actions";

type ShiftReconciliation = OverviewStats["recentShifts"][number];

export default function AdminShiftReconciliations({
  shifts,
  highlightedShiftId,
}: {
  shifts: ShiftReconciliation[];
  highlightedShiftId: string | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Recent Shift Duty Reconciliations</h2>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
              {shifts.length}
            </span>
            <span className="text-[11px] text-emerald-400/90 font-mono flex items-center gap-1 ml-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Feed
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Detailed audit trail of meter opening/closing readings and worker cash submissions
          </p>
        </div>
      </div>

      {shifts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/50 text-zinc-500 mb-3">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-300">No shift duties logged yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            When workers complete meter-reading shifts in the terminal, reconciliation audits will show here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pl-2">Worker &amp; Date</th>
                <th className="pb-3">Product</th>
                <th className="pb-3 text-right">Opening Meter</th>
                <th className="pb-3 text-right">Closing Meter</th>
                <th className="pb-3 text-right">Testing (L)</th>
                <th className="pb-3 text-right">Net Liters</th>
                <th className="pb-3 text-right">Expected Cash</th>
                <th className="pb-3 text-right">Actual Handover</th>
                <th className="pb-3 pr-2 text-right">Shortage / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {shifts.map((shift) => {
                const hasShortage = shift.shortage_amount > 0;
                const isBalanced = shift.shortage_amount === 0;
                const isHighlighted = shift.id === highlightedShiftId;

                return (
                  <tr
                    key={shift.id}
                    className={`transition-all duration-500 ${
                      isHighlighted
                        ? "bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/50"
                        : "hover:bg-zinc-800/20"
                    }`}
                  >
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 font-bold text-zinc-300 text-[11px]">
                          {shift.worker_name?.charAt(0) || "W"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-zinc-100">{shift.worker_name}</p>
                            {isHighlighted && (
                              <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 text-[9px] font-bold uppercase animate-pulse">
                                Just Synced
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500">
                            {new Date(shift.start_time).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(shift.start_time).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-zinc-200">{shift.product_name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          (@ Rs.{shift.price_per_liter})
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 text-right font-mono text-zinc-300">
                      {shift.opening_meter.toLocaleString()}
                    </td>

                    <td className="py-3.5 text-right font-mono text-zinc-300">
                      {shift.closing_meter > 0 ? shift.closing_meter.toLocaleString() : "Active"}
                    </td>

                    <td className="py-3.5 text-right font-mono text-zinc-400">
                      {shift.testing_liters > 0 ? `${shift.testing_liters} L` : "-"}
                    </td>

                    <td className="py-3.5 text-right font-mono font-bold text-emerald-400">
                      {shift.total_liters > 0 ? `${shift.total_liters.toLocaleString()} L` : "-"}
                    </td>

                    <td className="py-3.5 text-right font-mono text-zinc-300">
                      Rs. {shift.expected_cash.toLocaleString()}
                    </td>

                    <td className="py-3.5 text-right font-mono text-white font-semibold">
                      Rs. {shift.actual_cash.toLocaleString()}
                    </td>

                    <td className="py-3.5 pr-2 text-right">
                      {hasShortage ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          -Rs. {shift.shortage_amount.toLocaleString()}
                        </span>
                      ) : isBalanced ? (
                        <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          ✓ Balanced
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          +Rs. {Math.abs(shift.shortage_amount).toLocaleString()}
                        </span>
                      )}
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