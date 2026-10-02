import { getAdminKhataOverview } from "@/actions/khata-actions";
import WorkerWiseUdharReport from "@/components/admin/WorkerWiseUdharReport";
import { formatSouthAsianAmountInWords } from "@/lib/utils/number-to-words";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Worker Analytics | Petrol Station Admin",
  description:
    "Worker-wise Udhar breakdown — outstanding credit grouped by the worker who issued it.",
};

export default async function WorkerAnalyticsPage() {
  const result = await getAdminKhataOverview();

  if (!result.success || !result.overview) {
    return (
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <header className="border-b border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-white">Worker Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">Worker-wise Udhar Report</p>
        </header>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          {result.error || "Unable to load worker analytics data."}
        </div>
      </section>
    );
  }

  const { overview } = result;

  const totalCustomers = overview.customers.length;
  const workersSet = new Set(
    overview.customers
      .map((c) => c.issued_by_worker_name?.trim())
      .filter(Boolean)
  );
  const totalWorkers = workersSet.size;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8">
      <header className="border-b border-zinc-800 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          Live Worker Analytics
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Worker-Wise Udhar Report
        </h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-xl">
          Outstanding credit balances grouped and ranked by the worker who issued
          them. Use this view to audit accountability and identify credit
          concentration.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
            Total Outstanding Udhar
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-white">
            Rs.&nbsp;{overview.total_outstanding.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {formatSouthAsianAmountInWords(overview.total_outstanding)}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-6 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
            Workers Tracked
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-white">
            {totalWorkers}
          </p>
          <p className="mt-1 text-xs text-zinc-400">with assigned credit entries</p>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-6 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">
            Customers with Credit
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-white">
            {totalCustomers}
          </p>
          <p className="mt-1 text-xs text-zinc-400">cloud ledger accounts active</p>
        </div>
      </div>

      <WorkerWiseUdharReport
        customers={overview.customers}
        totalOutstanding={overview.total_outstanding}
      />
    </section>
  );
}
