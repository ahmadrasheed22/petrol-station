"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth-actions";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";

interface AdminNavProps {
  ownerName: string;
  isServiceRoleReady: boolean;
}

export default function AdminNav({ ownerName, isServiceRoleReady }: AdminNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected } = useRealtimeSync({ autoRefresh: false });

  const navLinks = [
    {
      label: "Overview",
      sublabel: "Sales & Shortages",
      href: "/admin",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      label: "Staff Management",
      sublabel: "Accounts & Duties",
      href: "/admin/workers",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: "Inventory & Tanks",
      sublabel: "Tanks & Stock In",
      href: "/admin/inventory",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      label: "Tanker Arrivals",
      sublabel: "Decanting & Audit",
      href: "/admin/tanker-arrivals",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h11v10H3zM14 10h4l3 3v4h-7M7 17a2 2 0 104 0m5 0a2 2 0 104 0M5 7V4h8v3" />
        </svg>
      ),
    },
    {
      label: "Khata Ledger",
      sublabel: "Customer Udhar",
      href: "/admin/khata",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
    {
      label: "Pump Configuration",
      sublabel: "Nozzles & Hardware",
      href: "/admin/pump-config",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Meter Readings",
      sublabel: "Liters & Reconciliation",
      href: "/admin/meter-readings",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Shift Logs",
      sublabel: "Duty history",
      href: "/admin/shift-logs",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm3 10h3m2 0h3" />
        </svg>
      ),
    },
    {
      label: "Expenses",
      sublabel: "Uploaded Expense Log",
      href: "/admin/expenses",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];
  const navigationOrder: Record<string, number> = {
    "/admin": 0,
    "/admin/meter-readings": 1,
    "/admin/shift-logs": 2,
    "/admin/expenses": 3,
    "/admin/inventory": 4,
    "/admin/tanker-arrivals": 5,
    "/admin/workers": 6,
    "/admin/pump-config": 7,
    "/admin/khata": 8,
  };
  const orderedNavLinks = [...navLinks].sort(
    (first, second) => navigationOrder[first.href] - navigationOrder[second.href]
  );

  const isLinkActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand Info */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close owner modules" : "Open owner modules"}
              aria-expanded={mobileMenuOpen}
              className="md:hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <span className="text-xl">👑</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Station Admin Hub
                </h1>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  OWNER
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Management & Audit Control</p>
            </div>
          </div>

          {/* Right Controls: Realtime Status, Service Key Status, Worker Mode Switcher, User & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Sync Status Indicator */}
            <div
              title={
                isConnected
                  ? "Supabase Realtime WebSocket Active: Streaming worker duties, expenses & khata"
                  : "Connecting to Supabase Realtime channel..."
              }
              className={`hidden md:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                isConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
              </span>
              <span>{isConnected ? "Live Sync Active" : "Connecting..."}</span>
            </div>

            {/* Service Role status indicator */}
            {!isServiceRoleReady ? (
              <div
                title="SUPABASE_SERVICE_ROLE_KEY is missing in .env.local"
                className="hidden lg:flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Service Key Required</span>
              </div>
            ) : (
              <div
                title="Service Role Admin API Active"
                className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Admin API Active</span>
              </div>
            )}

            {/* Quick Switch to Worker Duty Terminal */}
            <Link
              href="/?view=worker"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
              title="Test the meter-reading shift terminal as worker"
            >
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden sm:inline">Worker Terminal</span>
            </Link>

            {/* Owner Info & Logout */}
            <div className="flex items-center gap-2 pl-1 border-l border-zinc-800">
              <div className="hidden xl:block text-right">
                <p className="text-xs font-semibold text-zinc-200 leading-tight">{ownerName}</p>
                <p className="text-[10px] text-amber-400 font-medium">Station Owner</p>
              </div>

              <form action={logout}>
                <button
                  type="submit"
                  title="Sign Out"
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300 focus:outline-none"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <nav aria-label="Owner modules" className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 md:hidden space-y-1">
            {orderedNavLinks.map((item) => {
              const isActive = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-amber-500 text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span className={`text-xs ${isActive ? "text-zinc-900" : "text-zinc-500"}`}>
                    {item.sublabel}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <aside className="fixed inset-y-0 left-0 top-[65px] z-20 hidden w-64 border-r border-zinc-800/90 bg-zinc-950/95 px-3 py-5 md:block">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Owner Workspace
        </p>
        <nav aria-label="Owner modules" className="space-y-1">
          {orderedNavLinks.map((item) => {
            const isActive = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  isActive
                    ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                    : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <span className={isActive ? "text-amber-400" : "text-zinc-500"}>{item.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">{item.sublabel}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
