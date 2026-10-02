"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, PendingLedgerTransaction } from "@/lib/offline-db";

interface WorkerTodaySummaryProps {
  workerName: string;
}

export default function WorkerTodaySummary({ workerName }: WorkerTodaySummaryProps) {
  // Query ledger transactions from Dexie
  const ledgerTransactions = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      // Support both pendingLedgerTransactions and any table alias
      if (db.pendingLedgerTransactions) {
        return await db.pendingLedgerTransactions.toArray();
      }
      if ((db as unknown as { ledger_transactions?: { toArray: () => Promise<PendingLedgerTransaction[]> } }).ledger_transactions) {
        return await (db as unknown as { ledger_transactions: { toArray: () => Promise<PendingLedgerTransaction[]> } }).ledger_transactions.toArray();
      }
      return [];
    },
    [],
    []
  );

  const { totalCreditGiven, totalCashRecovered, creditCount, paymentCount } = useMemo(() => {
    const todayStr = new Date().toDateString();
    const normalizedWorker = (workerName || "").trim().toLowerCase();

    let totalCredit = 0;
    let totalCash = 0;
    let credits = 0;
    let payments = 0;

    (ledgerTransactions || []).forEach((tx: PendingLedgerTransaction) => {
      // 1. Date matching for today
      if (!tx.created_at) return;
      const txDateStr = new Date(tx.created_at).toDateString();
      if (txDateStr !== todayStr) return;

      // 2. Filter for current worker
      const issuedWorker = (tx.issued_by_worker_name || "").trim().toLowerCase();
      const receivedWorker = (tx.received_by_worker_name || "").trim().toLowerCase();
      const isMyTx = issuedWorker === normalizedWorker || receivedWorker === normalizedWorker;

      if (!isMyTx) return;

      // 3. Calculate totals based on transaction type
      const txType = (tx.transaction_type || "").toUpperCase();
      const amount = Number(tx.amount) || 0;

      if (txType === "CREDIT") {
        totalCredit += amount;
        credits += 1;
      } else if (txType === "PAYMENT") {
        totalCash += amount;
        payments += 1;
      }
    });

    return {
      totalCreditGiven: totalCredit,
      totalCashRecovered: totalCash,
      creditCount: credits,
      paymentCount: payments,
    };
  }, [ledgerTransactions, workerName]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-base font-bold text-white tracking-tight">Today&apos;s Summary</h3>
          <span className="text-xs text-zinc-400 font-medium">({workerName})</span>
        </div>
        <span className="text-xs text-zinc-400 font-mono bg-zinc-950/60 px-2.5 py-1 rounded-lg border border-zinc-800/60 w-fit">
          {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Credit Given */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-300/80 uppercase tracking-wider">Total Credit Given</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              Rs. {totalCreditGiven.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{creditCount} {creditCount === 1 ? "sale" : "sales"} today</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Total Cash Recovered */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-300/80 uppercase tracking-wider">Total Cash Recovered</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              Rs. {totalCashRecovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{paymentCount} {paymentCount === 1 ? "payment" : "payments"} today</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
