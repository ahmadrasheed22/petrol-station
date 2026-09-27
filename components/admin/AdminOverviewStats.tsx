import { type OverviewStats } from "@/actions/admin-actions";

export default function AdminOverviewStats({ data }: { data: OverviewStats }) {
  const isShortage = data.todayShortageAmount > 0;
  const isSurplus = data.todayShortageAmount < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-lg transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Fuel Dispensed</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">
            {data.todayLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-bold text-zinc-400">Liters</span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">Across completed meter shifts</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-lg transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Expected Revenue</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">
            Rs. {data.todayExpectedCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">Gross sales calculated by meter</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-lg transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Cash Collected</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">
            Rs. {data.todayActualCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">Physical cash turned in by staff</p>
      </div>

      <div
        className={`rounded-2xl border p-5 backdrop-blur-md shadow-lg transition-all ${
          isShortage
            ? "border-red-500/40 bg-red-950/20"
            : isSurplus
            ? "border-emerald-500/40 bg-emerald-950/20"
            : "border-zinc-800 bg-zinc-900/60"
        }`}
      >
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">
            {isShortage ? "Cash Shortage (Loss)" : isSurplus ? "Cash Surplus" : "Cash Variance"}
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isShortage
                ? "bg-red-500/20 text-red-400"
                : isSurplus
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isShortage
                    ? "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    : "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                }
              />
            </svg>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl font-black ${
              isShortage ? "text-red-400" : isSurplus ? "text-emerald-400" : "text-zinc-100"
            }`}
          >
            {isShortage ? "-" : isSurplus ? "+" : ""}Rs.{" "}
            {Math.abs(data.todayShortageAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          {isShortage
            ? "Discrepancy: Workers handed over less than meter sales"
            : isSurplus
            ? "Excess cash turned in over meter calculations"
            : "Meter readings and cash perfectly balanced"}
        </p>
      </div>
    </div>
  );
}