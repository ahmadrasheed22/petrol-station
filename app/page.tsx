import { getAuthenticatedUser } from "@/lib/services/user-service";
import { logout } from "@/actions/auth-actions";
import SyncIndicator from "@/components/SyncIndicator";
import ShiftManager from "@/components/ShiftManager";
import SalesForm from "@/components/SalesForm";
import ExpenseForm from "@/components/ExpenseForm";
import DashboardStats from "@/components/DashboardStats";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Navigation / Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Petrol Station Dashboard
              </h1>
              <p className="text-xs text-zinc-400">System Management & Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/khata"
              className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-400 transition-colors hover:bg-indigo-500/20 hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              Go to Khata/Ledger
            </Link>
            <SyncIndicator />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-zinc-400">Signed in as</span>
              <span className="text-sm font-medium text-emerald-400">
                {user.email}
              </span>
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
        {/* User Session Banner */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Session Active
              </div>
              <h2 className="text-2xl font-bold text-white">
                Welcome back, {user.email}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Authenticated session managed via User Service & Proxy Routing.
              </p>
            </div>
            <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80 text-xs font-mono text-zinc-400 space-y-1">
              <div><span className="text-zinc-500">User ID:</span> {user.id}</div>
              <div><span className="text-zinc-500">Last Sign In:</span> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Real-time Dexie Dashboard Stats */}
        <DashboardStats />

        {/* Pump Operations & Expense Logging Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ShiftManager userId={user.id} />
          <SalesForm />
          <ExpenseForm />
        </div>


        {/* Dashboard Operations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Pump Operations</span>
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-white">Online</div>
            <p className="text-xs text-zinc-500">All nozzles ready & operational</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Offline Sync</span>
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-white">Ready</div>
            <p className="text-xs text-zinc-500">IndexedDB local queue active</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Security State</span>
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-white">Protected</div>
            <p className="text-xs text-zinc-500">Proxy Routing & Service Layer active</p>
          </div>
        </div>
      </main>
    </div>
  );
}
