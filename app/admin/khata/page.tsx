import { getAdminKhataOverview } from "@/actions/khata-actions";
import KhataApprovalQueue from "@/components/admin/KhataApprovalQueue";
import CustomerLedgerHistory from "@/components/admin/CustomerLedgerHistory";
import { formatSouthAsianAmountInWords } from "@/lib/utils/number-to-words";

export const dynamic = "force-dynamic";

export default async function AdminKhataPage() {
  const result = await getAdminKhataOverview();

  if (!result.success || !result.overview) {
    return <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{result.error || "Unable to load the Khata dashboard."}</p>;
  }

  const { overview } = result;
  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border-b border-zinc-800 pb-5">
        <h1 className="text-2xl font-bold text-white">Khata Ledger</h1>
        <p className="mt-1 text-sm text-zinc-400">Master customer balances and worker payment approvals</p>
      </header>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Total Outstanding Udhar</p>
        <p className="mt-2 text-4xl font-black tracking-tight text-white">Rs. {overview.total_outstanding.toLocaleString()}</p>
        <p className="mt-1 text-sm text-zinc-400">{formatSouthAsianAmountInWords(overview.total_outstanding)}</p>
        <p className="mt-2 text-xs text-zinc-400">Across {overview.customers.length} customers with cloud ledger activity</p>
      </div>

      <KhataApprovalQueue entries={overview.pending_approvals} />


      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl sm:p-6">
        <div className="border-b border-zinc-800 pb-5">
          <h2 className="text-lg font-bold text-white">Customer Directory</h2>
          <p className="mt-1 text-xs text-zinc-400">Latest cloud activity and current outstanding balance.</p>
        </div>
        <CustomerLedgerHistory customers={overview.customers} />
      </section>
    </section>
  );
}