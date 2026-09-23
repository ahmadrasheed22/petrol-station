import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { logout } from "@/actions/auth-actions";
import SyncIndicator from "@/components/SyncIndicator";
import CreditSaleForm from "@/components/CreditSaleForm";
import CustomerBalances from "@/components/CustomerBalances";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function KhataPage() {
  const authData = await getAuthenticatedUserProfile();

  if (!authData) {
    redirect("/login");
  }

  const { user, profile } = authData;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Header & Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Back to Dashboard</span>
            </Link>

            <Link
              href="/inventory"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <span>Inventory & Tanks</span>
            </Link>

            <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Customer Ledger (Khata)
                </h1>
                <p className="text-xs text-zinc-400">
                  Offline Credit Sales & Balance Tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <SyncIndicator />
            <div className="hidden sm:flex flex-col text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-semibold text-white">
                  {profile.name}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    profile.role === "owner"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}
                >
                  {profile.role}
                </span>
              </div>
              <span className="text-xs text-zinc-400">{user.email}</span>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner Section */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-400 mb-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                Offline-First Ledger Engine Active
              </div>
              <h2 className="text-2xl font-bold text-white">
                Khata & Customer Credit Management
              </h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
                Log customer fuel credit sales directly into IndexedDB without internet. Balances
                update locally in real time and automatically synchronize to Supabase when online.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80 text-xs text-zinc-400 space-y-1">
                <div><span className="text-zinc-500">Storage:</span> Dexie.js (Schema v4)</div>
                <div><span className="text-zinc-500">Cloud Target:</span> Supabase ledger_transactions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Khata Operational Grid: Form & Customer Balances */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <CreditSaleForm />
          <CustomerBalances />
        </div>
      </main>
    </div>
  );
}
