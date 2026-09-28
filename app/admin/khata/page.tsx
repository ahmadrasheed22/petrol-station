import CustomerBalances from "@/components/CustomerBalances";

export default function AdminKhataPage() {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border-b border-zinc-800 pb-5">
        <h1 className="text-2xl font-bold text-white">Khata Ledger</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Customer balances and ledger records
        </p>
      </header>
      <CustomerBalances />
    </section>
  );
}