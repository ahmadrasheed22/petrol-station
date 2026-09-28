import { createClient } from "@/lib/supabase/server";
import { getWorkersList } from "@/actions/admin-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shift Logs | Station Admin Hub",
  description: "Track current worker duties and review completed shifts.",
};

type ShiftLogRecord = {
  id: string;
  worker_id: string | null;
  start_time: string;
  end_time: string | null;
  worker: Array<{ name: string | null }> | null;
};

type ShiftLogRow = {
  id: string;
  workerName: string;
  credential: string;
  shift: ShiftLogRecord | null;
  status: string;
};

export default async function AdminShiftLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const requestedDate = (await searchParams)?.date;
  const parsedDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? new Date(`${requestedDate}T00:00:00.000Z`)
    : null;
  const selectedDate = parsedDate?.toISOString().slice(0, 10) === requestedDate
    ? requestedDate!
    : today;
  const dayStart = new Date(`${selectedDate}T00:00:00+05:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const supabase = await createClient();
  const [{ data: shifts, error }, workers] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, worker_id, start_time, end_time, worker:profiles(name)")
      .gte("start_time", dayStart.toISOString())
      .lt("start_time", dayEnd.toISOString())
      .order("start_time", { ascending: false }),
    getWorkersList(),
  ]);

  const activeShifts = (shifts || []).filter((shift) => !shift.end_time).length;
  const rosterWorkerIds = new Set(workers.map((worker) => worker.id));
  const rosterRows: ShiftLogRow[] = workers.flatMap<ShiftLogRow>((worker) => {
    const workerShifts = (shifts || []).filter((shift) => shift.worker_id === worker.id);
    const credential = worker.phone || worker.email || "Not available";
    if (workerShifts.length === 0) {
      return [{
        id: `absent-${worker.id}`,
        workerName: worker.name,
        credential,
        shift: null,
        status: "Absent",
      }];
    }

    return workerShifts.map((shift) => ({
      id: shift.id,
      workerName: worker.name,
      credential,
      shift,
      status: shift.end_time ? "Completed" : selectedDate === today ? "Active" : "Not Ended",
    }));
  });
  const unmatchedRows: ShiftLogRow[] = (shifts || [])
    .filter((shift) => !shift.worker_id || !rosterWorkerIds.has(shift.worker_id))
    .map((shift) => ({
      id: shift.id,
      workerName: shift.worker?.[0]?.name || "Unknown worker",
      credential: "Not available",
      shift,
      status: shift.end_time ? "Completed" : selectedDate === today ? "Active" : "Not Ended",
    }));
  const rows = [...rosterRows, ...unmatchedRows].sort((left, right) =>
    (right.shift?.start_time || "").localeCompare(left.shift?.start_time || "") ||
    left.workerName.localeCompare(right.workerName)
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Operations</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Shift Logs</h1>
        <p className="mt-1 text-sm text-zinc-400">Worker attendance and duty history for the selected date.</p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-medium text-zinc-400">
          Shift date
          <input
            type="date"
            name="date"
            value={selectedDate}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
        >
          View date
        </button>
      </form>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Shift summary">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Active duties</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{activeShifts}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Records shown</p>
          <p className="mt-2 text-2xl font-bold text-white">{rows.length}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Duty history</h2>
          <p className="mt-1 text-xs text-zinc-500">{selectedDate} · {workers.length} workers on roster</p>
        </div>

        {error ? (
          <p className="p-6 text-sm text-rose-300" role="alert">
            Unable to load shift logs: {error.message}
          </p>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-950/60 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Worker / email</th>
                  <th className="px-4 py-3 font-semibold">Duty started</th>
                  <th className="px-4 py-3 font-semibold">Duty ended</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.map((row) => {
                  return (
                    <tr key={row.id} className="text-zinc-300 hover:bg-zinc-800/30">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-zinc-100">
                          {row.workerName}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{row.credential}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-300">
                        {row.shift
                          ? new Date(row.shift.start_time).toLocaleString("en-PK", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : new Date(`${selectedDate}T12:00:00+05:00`).toLocaleDateString("en-PK", {
                              dateStyle: "medium",
                            })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-400">
                        {row.shift?.end_time
                          ? new Date(row.shift.end_time).toLocaleString("en-PK", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {row.status === "Absent" ? (
                          <span className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300">
                            Absent
                          </span>
                        ) : row.status === "Completed" ? (
                          <span className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {row.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-zinc-500">No shift records found.</p>
        )}
      </section>
    </div>
  );
}
