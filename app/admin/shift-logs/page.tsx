import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatPhoneDisplay, isWorkerEmail } from "@/lib/utils/phone";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shift Logs | Station Admin Hub",
  description: "Track current worker duties and review completed shifts.",
};

export default async function AdminShiftLogsPage() {
  const supabase = await createClient();
  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, worker_id, start_time, end_time, worker:profiles(name)")
    .order("start_time", { ascending: false })
    .limit(250);

  const workerEmails = new Map<string, string>();
  const adminClient = getAdminClient();

  if (adminClient) {
    const { data, error: usersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (!usersError) {
      for (const user of data.users) {
        if (user.email) workerEmails.set(user.id, user.email);
      }
    }
  }

  const activeShifts = (shifts || []).filter((shift) => !shift.end_time).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Operations</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Shift Logs</h1>
        <p className="mt-1 text-sm text-zinc-400">Current duty status and recent shift history.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Shift summary">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Active duties</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{activeShifts}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Records shown</p>
          <p className="mt-2 text-2xl font-bold text-white">{shifts?.length ?? 0}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Duty history</h2>
          <p className="mt-1 text-xs text-zinc-500">Showing the latest 250 shifts.</p>
        </div>

        {error ? (
          <p className="p-6 text-sm text-rose-300" role="alert">
            Unable to load shift logs: {error.message}
          </p>
        ) : shifts?.length ? (
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
                {shifts.map((shift) => {
                  const email = shift.worker_id ? workerEmails.get(shift.worker_id) : undefined;
                  const login = email
                    ? isWorkerEmail(email)
                      ? formatPhoneDisplay(email)
                      : email
                    : "Not available";

                  return (
                    <tr key={shift.id} className="text-zinc-300 hover:bg-zinc-800/30">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-zinc-100">
                          {shift.worker?.[0]?.name || "Unknown worker"}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{login}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-300">
                        {new Date(shift.start_time).toLocaleString("en-PK", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-400">
                        {shift.end_time
                          ? new Date(shift.end_time).toLocaleString("en-PK", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {shift.end_time ? (
                          <span className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
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
