"use client";

import { type CustomerDirectoryEntry } from "@/actions/khata-actions";

interface WorkerGroup {
  workerName: string;
  totalCredit: number;
  customerCount: number;
  customers: Array<{ name: string; balance: number }>;
}

function groupByWorker(customers: CustomerDirectoryEntry[]): WorkerGroup[] {
  const map = new Map<string, WorkerGroup>();

  for (const customer of customers) {
    const workerName = customer.issued_by_worker_name?.trim() || "—";
    if (!map.has(workerName)) {
      map.set(workerName, {
        workerName,
        totalCredit: 0,
        customerCount: 0,
        customers: [],
      });
    }
    const group = map.get(workerName)!;
    group.totalCredit += Math.max(customer.total_balance, 0);
    group.customerCount += 1;
    group.customers.push({ name: customer.name, balance: customer.total_balance });
  }

  // Sort descending by total credit
  return Array.from(map.values()).sort((a, b) => b.totalCredit - a.totalCredit);
}

const WORKER_COLORS = [
  { ring: "ring-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-300", badge: "bg-violet-500/20 text-violet-300 border-violet-500/30", bar: "bg-violet-500/60" },
  { ring: "ring-sky-500/40",    bg: "bg-sky-500/10",    text: "text-sky-300",    badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",           bar: "bg-sky-500/60"    },
  { ring: "ring-amber-500/40",  bg: "bg-amber-500/10",  text: "text-amber-300",  badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",     bar: "bg-amber-500/60"  },
  { ring: "ring-rose-500/40",   bg: "bg-rose-500/10",   text: "text-rose-300",   badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",        bar: "bg-rose-500/60"   },
  { ring: "ring-teal-500/40",   bg: "bg-teal-500/10",   text: "text-teal-300",   badge: "bg-teal-500/20 text-teal-300 border-teal-500/30",        bar: "bg-teal-500/60"   },
];

function WorkerCard({
  group,
  rank,
  colorIndex,
  totalOutstanding,
}: {
  group: WorkerGroup;
  rank: number;
  colorIndex: number;
  totalOutstanding: number;
}) {
  const colors = WORKER_COLORS[colorIndex % WORKER_COLORS.length];
  const sharePercent =
    totalOutstanding > 0 ? ((group.totalCredit / totalOutstanding) * 100).toFixed(1) : "0.0";

  return (
    <div
      className={`rounded-2xl border ring-1 ${colors.ring} border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-sm shadow-lg flex flex-col gap-4`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.bg} font-black text-lg ${colors.text}`}
          >
            {rank}
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">
              {group.workerName === "—" ? "Unassigned / Unknown" : group.workerName}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {group.customerCount} customer{group.customerCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colors.badge}`}>
          {sharePercent}% of total
        </div>
      </div>

      {/* Credit amount */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">
          Total Credit Issued
        </p>
        <p className="text-2xl font-black tracking-tight text-white">
          Rs.&nbsp;{group.totalCredit.toLocaleString()}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${colors.bar}`}
          style={{ width: `${sharePercent}%` }}
        />
      </div>

      {/* Customer breakdown */}
      {group.customers.length > 0 && (
        <ul className="space-y-1.5 pt-1 border-t border-zinc-800">
          {group.customers.map((c) => (
            <li key={c.name} className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 truncate max-w-[55%]">{c.name}</span>
              <span className="text-zinc-400 font-medium">Rs.&nbsp;{c.balance.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function WorkerWiseUdharReport({
  customers,
  totalOutstanding,
}: {
  customers: CustomerDirectoryEntry[];
  totalOutstanding: number;
}) {
  const groups = groupByWorker(customers);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl sm:p-6 space-y-5">
      {/* Section header */}
      <div className="border-b border-zinc-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Worker Analytics
          </div>
          <h2 className="text-lg font-bold text-white">Worker-Wise Udhar Report</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Outstanding credit grouped by the worker who issued it.
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Workers tracked</p>
          <p className="text-2xl font-black text-white">{groups.length}</p>
        </div>
      </div>

      {/* Worker cards */}
      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          No outstanding customer balances found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((group, idx) => (
            <WorkerCard
              key={group.workerName}
              group={group}
              rank={idx + 1}
              colorIndex={idx}
              totalOutstanding={totalOutstanding}
            />
          ))}
        </div>
      )}
    </section>
  );
}
