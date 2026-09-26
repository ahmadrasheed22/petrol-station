"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { logout } from "@/actions/auth-actions";
import DashboardStats from "@/components/DashboardStats";
import ExpenseForm from "@/components/ExpenseForm";
import RecentEntries from "@/components/RecentEntries";
import ShiftDutyMeterReadings from "@/components/ShiftDutyMeterReadings";
import SyncIndicator from "@/components/SyncIndicator";
import TankStatus from "@/components/TankStatus";
import CreditSaleForm from "@/components/CreditSaleForm";
import CustomerBalances from "@/components/CustomerBalances";

export type WorkerView = "home" | "expenses" | "khata" | "inventory";

const NAV_ITEMS: Array<{ key: WorkerView; label: string; shortLabel: string; icon: string }> = [
  { key: "home", label: "Meter Readings", shortLabel: "Home", icon: "◔" },
  { key: "expenses", label: "Daily Expenses", shortLabel: "Expenses", icon: "✦" },
  { key: "khata", label: "Khata", shortLabel: "Khata", icon: "▣" },
  { key: "inventory", label: "Tank Inventory", shortLabel: "Inventory", icon: "◫" },
];

export default function WorkerDashboardShell({
  userId,
  workerName,
  role,
  userEmail,
  isOwnerPreview,
}: {
  userId: string;
  workerName: string;
  role: string;
  userEmail?: string | null;
  isOwnerPreview?: boolean;
}) {
  const [activeView, setActiveView] = useState<WorkerView>("home");

  const currentView = useMemo(
    () => NAV_ITEMS.find((item) => item.key === activeView) ?? NAV_ITEMS[0],
    [activeView]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {isOwnerPreview && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-300">
          <span>👑 You are previewing the Worker Terminal as Station Owner.</span>
          <Link href="/admin" className="ml-2 font-semibold underline hover:text-amber-200">
            Return to Admin Hub →
          </Link>
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-800 bg-zinc-900/80 p-5 lg:flex lg:flex-col backdrop-blur-xl">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-lg text-emerald-400 shadow-lg shadow-emerald-500/10">
              ⚡
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Station</p>
              <h1 className="text-lg font-bold text-white">Worker Console</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveView(item.key)}
                  className={[
                    "flex w-full items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition-all duration-200",
                    isActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-lg shadow-emerald-500/10"
                      : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/80 hover:text-white",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-sm">
                      {item.icon}
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </span>
                  {isActive && <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Worker</p>
                <p className="mt-1 text-sm font-semibold text-white">{workerName}</p>
              </div>
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  role === "owner"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-blue-500/30 bg-blue-500/10 text-blue-300",
                ].join(" ")}
              >
                {role}
              </span>
            </div>

            <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-400">
              <div className="mb-2 flex items-center justify-between">
                <span>Online status</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="truncate">{userEmail || "No email available"}</div>
            </div>

            <form action={logout} className="pt-1">
              <button
                type="submit"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 lg:hidden">
                  ⚡
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Operations</p>
                  <h2 className="text-lg font-bold text-white">{currentView.label}</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <SyncIndicator />
              </div>
            </div>

            <div className="border-t border-zinc-800 bg-zinc-950/60 px-4 py-3 lg:hidden">
              <nav className="grid grid-cols-4 gap-2">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeView === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveView(item.key)}
                      className={[
                        "rounded-xl border px-2 py-2 text-center text-[11px] font-semibold transition-colors",
                        isActive
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400",
                      ].join(" ")}
                    >
                      {item.shortLabel}
                    </button>
                  );
                })}
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 pb-24 lg:pb-8">
            <div className={activeView === "home" ? "space-y-6" : "hidden"}>
              <>
                <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Session Active
                      </div>
                      <h3 className="text-2xl font-bold text-white">Welcome back, {workerName}</h3>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-xs text-zinc-400">
                      <div>
                        <span className="text-zinc-500">Role:</span> <span className="text-zinc-200">{role}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Desk:</span> <span className="text-zinc-200">Fuel Operations</span>
                      </div>
                    </div>
                  </div>
                </section>

                <DashboardStats />
                <ShiftDutyMeterReadings userId={userId} workerName={workerName} />
                <RecentEntries initialFilter="sale" showFilterTabs={false} />
              </>
            </div>

            {activeView === "expenses" && (
              <>
                <ExpenseForm />
                <RecentEntries initialFilter="expense" showFilterTabs={false} />
              </>
            )}

            {activeView === "khata" && (
              <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
                <CreditSaleForm />
                <CustomerBalances />
              </div>
            )}

            {activeView === "inventory" && <TankStatus />}
          </main>
        </div>
      </div>
    </div>
  );
}
