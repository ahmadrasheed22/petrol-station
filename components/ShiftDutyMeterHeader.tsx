interface ShiftDutyMeterHeaderProps {
  mode: "management" | "readings";
  isActive: boolean;
  message: { type: "success" | "error"; text: string } | null;
  onDismissMessage: () => void;
}

export default function ShiftDutyMeterHeader({
  mode,
  isActive,
  message,
  onDismissMessage,
}: ShiftDutyMeterHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {mode === "management" ? "Shift Management" : "Meter Readings"}
            </h2>
            <p className="text-xs text-zinc-400">
              {mode === "management"
                ? "Start or end your duty session."
                : "Record opening and closing readings for every active meter."}
            </p>
          </div>
        </div>

        <div>
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Duty Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              Duty Locked
            </span>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-3 text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={onDismissMessage}
            className="ml-2 text-sm font-bold cursor-pointer hover:opacity-75"
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}