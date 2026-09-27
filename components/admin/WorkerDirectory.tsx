import type { WorkerItem } from "@/actions/admin-actions";

interface WorkerDirectoryProps {
  workers: WorkerItem[];
  filteredWorkers: WorkerItem[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export default function WorkerDirectory({
  workers,
  filteredWorkers,
  searchQuery,
  onSearchQueryChange,
}: WorkerDirectoryProps) {
  return (
    <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Active Workers Directory</h2>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
              {workers.length}
            </span>
          </div>
          <p className="text-xs text-zinc-400">Staff members authorized for shift duties</p>
        </div>
        <div className="w-full sm:w-56">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search staff..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {filteredWorkers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/50 text-zinc-500 mb-3">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-300">No worker accounts found</p>
          <p className="mt-1 text-xs text-zinc-500">Use the form to add your first station worker.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pl-2">Worker</th>
                <th className="pb-3">Login Credential</th>
                <th className="pb-3">Type</th>
                <th className="pb-3 pr-2 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredWorkers.map((worker) => {
                const hasPhone = Boolean(worker.phone);
                const displayCred = hasPhone
                  ? worker.phone
                  : worker.email && !worker.email.includes("@pump.worker")
                  ? worker.email
                  : worker.loginId || "—";

                return (
                  <tr key={worker.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-bold text-emerald-400">
                          {worker.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-100">{worker.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">ID: {worker.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-zinc-300 font-mono">
                      <div className="flex items-center gap-1.5">
                        {hasPhone ? (
                          <svg className="h-3.5 w-3.5 text-emerald-400/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-amber-400/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        )}
                        <span className="font-semibold text-zinc-200 text-[11px]">{displayCred}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          WORKER
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                          hasPhone
                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500/70"
                            : "border-amber-500/20 bg-amber-500/5 text-amber-500/70"
                        }`}>
                          {hasPhone ? "Phone" : "Email"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-2 text-right text-zinc-400">
                      {new Date(worker.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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