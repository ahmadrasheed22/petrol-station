import { createClient } from "@/lib/supabase/server";
import AdminExpensesManager, { type AdminExpense } from "@/components/admin/AdminExpensesManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Expenses | Station Admin Hub",
  description: "Review expenses uploaded by station staff.",
};

export default async function AdminExpensesPage() {
  const supabase = await createClient();
  const { data: expenses, error } = await supabase
    .from("expenses")
    .select(
      "id, shift_id, amount, description, created_at, shift:shifts!shift_id(worker:profiles!shifts_worker_id_fkey(name))"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Operations</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Uploaded Expenses</h1>
        <p className="mt-1 text-sm text-zinc-400">Latest expense entries submitted by station staff.</p>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300" role="alert">
          Unable to load expenses: {error.message}
        </p>
      ) : (
        <AdminExpensesManager expenses={(expenses || []) as AdminExpense[]} />
      )}
    </div>
  );
}