"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  bulkApproveLedgerPayments,
  updateLedgerApproval,
  type PendingApprovalEntry,
} from "@/actions/khata-actions";

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function KhataApprovalQueue({ entries }: { entries: PendingApprovalEntry[] }) {
  const router = useRouter();
  const [visibleEntries, setVisibleEntries] = useState(entries);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setVisibleEntries(entries);
  }, [entries]);

  function runAction(action: () => Promise<{ success: boolean; error?: string }>, ids: string[]) {
    setError(null);
    setLoadingIds((current) => new Set([...current, ...ids]));
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) setError(result.error || "Unable to update payment.");
        else {
          setVisibleEntries((current) => current.filter((entry) => !ids.includes(entry.id)));
          setSelected([]);
          router.refresh();
        }
      } finally {
        setLoadingIds((current) => {
          const next = new Set(current);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }
    });
  }

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  const allSelected = visibleEntries.length > 0 && selected.length === visibleEntries.length;

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-zinc-900/70 p-5 shadow-xl sm:p-6">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Pending Approvals</h2>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300">
              {visibleEntries.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Payments received by workers awaiting owner confirmation.</p>
        </div>
        <button
          type="button"
          disabled={selected.length === 0 || isPending}
          onClick={() => runAction(() => bulkApproveLedgerPayments(selected), selected)}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve Selected ({selected.length})
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      {visibleEntries.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">No payments are waiting for approval.</div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[860px] text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input aria-label="Select all pending payments" type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : visibleEntries.map((entry) => entry.id))} />
                </th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount Received</th>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Issued By</th>
                <th className="px-4 py-3">Received By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {visibleEntries.map((entry) => (
                <tr key={entry.id} className={`transition-opacity hover:bg-zinc-800/30 ${loadingIds.has(entry.id) ? "opacity-40" : ""}`}>
                  <td className="px-4 py-4"><input aria-label={`Select ${entry.customer_name}`} type="checkbox" checked={selected.includes(entry.id)} disabled={loadingIds.has(entry.id)} onChange={() => toggleSelected(entry.id)} /></td>
                  <td className="px-4 py-4 font-semibold text-white">{entry.customer_name}</td>
                  <td className="px-4 py-4 font-bold text-emerald-400">Rs. {entry.amount.toLocaleString()}</td>
                  <td suppressHydrationWarning className="px-4 py-4 whitespace-nowrap text-zinc-400">{formatDate(entry.created_at)}</td>
                  <td className="px-4 py-4 text-zinc-300">{entry.issued_by_worker_name}</td>
                  <td className="px-4 py-4 font-semibold text-amber-300">{entry.received_by_worker_name}</td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2">
                    <button type="button" disabled={loadingIds.has(entry.id)} onClick={() => runAction(() => updateLedgerApproval(entry.id, "SETTLED"), [entry.id])} className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40">Approve</button>
                    <button type="button" disabled={loadingIds.has(entry.id)} onClick={() => runAction(() => updateLedgerApproval(entry.id, "UNPAID"), [entry.id])} className="rounded-lg border border-zinc-700 px-3 py-2 text-[11px] font-bold text-zinc-300 hover:border-red-400 hover:text-red-300 disabled:opacity-40">Reject / Revert</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loadingIds.size > 0 && <p className="mt-3 text-right text-[11px] text-zinc-500">Updating payment...</p>}
    </section>
  );
}