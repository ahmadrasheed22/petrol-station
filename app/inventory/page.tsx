import { getAuthenticatedUser } from "@/lib/services/user-service";
import { logout } from "@/actions/auth-actions";
import SyncIndicator from "@/components/SyncIndicator";
import InventoryArrivalForm from "@/components/InventoryArrivalForm";
import TankStatus from "@/components/TankStatus";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function InventoryPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

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
              <span>Dashboard</span>
            </Link>

            <Link
              href="/khata"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <span>Customer Khata</span>
            </Link>

            <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Inventory & Fuel Tankers
                </h1>
                <p className="text-xs text-zinc-400">
                  Offline Tanker Arrivals & Storage Management
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <SyncIndicator />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-zinc-400">Signed in as</span>
              <span className="text-sm font-medium text-amber-400">
                {user.email}
              </span>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
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
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 mb-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Offline-First Inventory Pipeline Active
              </div>
              <h2 className="text-2xl font-bold text-white">
                Tanker Delivery Intake & Fuel Levels
              </h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
                Log fuel deliveries directly into IndexedDB without needing an active internet connection.
                Arrivals are staged locally and seamlessly synchronized to Supabase{" "}
                <code className="text-amber-400/90 text-xs bg-zinc-800 px-1 py-0.5 rounded font-mono">
                  inventory_arrivals
                </code>{" "}
                when connectivity is restored.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80 text-xs text-zinc-400 space-y-1">
                <div>
                  <span className="text-zinc-500">Storage:</span> Dexie.js (Schema v5)
                </div>
                <div>
                  <span className="text-zinc-500">Cloud Target:</span> Supabase inventory_arrivals
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Grid: Form & Tank Levels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <InventoryArrivalForm />
          <TankStatus />
        </div>
      </main>
    </div>
  );
}
