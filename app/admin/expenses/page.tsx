import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Expenses | Station Admin Hub",
  description: "Review expenses uploaded by station staff.",
};

export default async function AdminExpensesPage() {
  const supabase = await createClient();
  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("id, shift_id, amount, description, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const totalAmount = (expenses || []).reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Operations</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Uploaded Expenses</h1>
        <p className="mt-1 text-sm text-zinc-400">Latest expense entries submitted by station staff.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Expense summary">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Records shown</p>
          <p className="mt-2 text-2xl font-bold text-white">{expenses?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total shown</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            Rs. {totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Expense history</h2>
          <p className="mt-1 text-xs text-zinc-500">Showing the latest 100 uploaded records.</p>
        </div>

        {error ? (
          <p className="p-6 text-sm text-rose-300" role="alert">Unable to load expenses: {error.message}</p>
        ) : expenses?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-zinc-950/60 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Duty reference</th>
                  <th className="px-4 py-3 font-semibold">Uploaded</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="text-zinc-300 hover:bg-zinc-800/30">
                    <td className="px-4 py-3.5 font-medium text-zinc-100">
                      {expense.description || "Station expense"}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-zinc-500">
                      {expense.shift_id ? expense.shift_id.slice(0, 8) : "Unassigned"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      {new Date(expense.created_at).toLocaleString("en-PK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-300">
                      Rs. {Number(expense.amount || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-zinc-500">No uploaded expenses found.</p>
        )}
      </section>
    </div>
  );
}