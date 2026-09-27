"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline-db";

export default function DutyAccessGuard({ children }: { children: ReactNode }) {
  const hasActiveDuty = useLiveQuery(
    async () => Boolean(await db.shifts.where("status").equals("active").first()),
    [],
    false
  ) ?? false;

  if (!hasActiveDuty) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Active duty required</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Start duty from Shift Management before accessing this section.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Go to Shift Management
          </Link>
        </section>
      </main>
    );
  }

  return children;
}