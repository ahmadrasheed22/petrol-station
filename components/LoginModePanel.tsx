export type LoginPageMode = "worker" | "owner" | "register";

interface LoginModePanelProps {
  mode: LoginPageMode;
  error: string | null;
  onModeChange: (mode: LoginPageMode) => void;
}

export default function LoginModePanel({ mode, error, onModeChange }: LoginModePanelProps) {
  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl bg-zinc-950/80 p-1.5 border border-zinc-800/80">
        <button
          type="button"
          id="tab-worker"
          onClick={() => onModeChange("worker")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
            mode === "worker"
              ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="hidden sm:inline">Worker</span>
          <span className="sm:hidden">Staff</span>
        </button>

        <button
          type="button"
          id="tab-owner"
          onClick={() => onModeChange("owner")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
            mode === "owner"
              ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-600/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="hidden sm:inline">Owner</span>
          <span className="sm:hidden">Owner</span>
        </button>

        <button
          type="button"
          id="tab-register"
          onClick={() => onModeChange("register")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
            mode === "register"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Register</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 rounded-full animate-pulse ${
              mode === "worker" ? "bg-emerald-400" : mode === "owner" ? "bg-amber-400" : "bg-indigo-400"
            }`}
          />
          <span className="text-zinc-300 font-medium">
            {mode === "worker"
              ? "Attendant Portal (اسٹاف پورٹل)"
              : mode === "owner"
              ? "Owner & Admin Management"
              : "Create New Owner Account"}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
            mode === "worker"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : mode === "owner"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          }`}
        >
          {mode === "worker" ? "Phone / Email" : mode === "owner" ? "Email Auth" : "Sign Up"}
        </span>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-300">
          <svg className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 leading-relaxed">
            <p className="font-semibold text-rose-200">
              {mode === "register" ? "Registration Failed" : "Authentication Failed"}
            </p>
            <p className="mt-0.5 text-rose-300/90">{error}</p>
          </div>
        </div>
      )}
    </>
  );
}