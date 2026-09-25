"use client";

import { useState, useTransition } from "react";
import { login, loginWorker, registerOwner } from "@/actions/auth-actions";

type PageMode = "worker" | "owner" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<PageMode>("worker");

  // Worker login state
  const [workerIdentifier, setWorkerIdentifier] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);

  // Owner login state
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  // Owner registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleModeChange = (m: PageMode) => {
    setMode(m);
    setError(null);
  };

  // Worker login handler
  const handleWorkerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await loginWorker(workerIdentifier, workerPassword);
      if (res?.error) setError(res.error);
    });
  };

  // Owner login handler
  const handleOwnerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await login(ownerEmail, ownerPassword);
      if (res?.error) setError(res.error);
    });
  };

  // Owner registration handler
  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (regPassword !== regPasswordConfirm) {
      setError("Passwords do not match. Please try again.");
      return;
    }
    startTransition(async () => {
      const res = await registerOwner(regName, regEmail, regPassword);
      if (res?.error) setError(res.error);
    });
  };

  // Detect if worker identifier is likely an email or phone for the hint
  const isWorkerEmail = workerIdentifier.includes("@");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100 selection:bg-emerald-500 selection:text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[130px]" />
        <div className="h-[350px] w-[350px] rounded-full bg-amber-500/5 blur-[100px]" />
        <div className="absolute top-0 right-0 h-[250px] w-[250px] rounded-full bg-indigo-500/4 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-lg space-y-6">
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-zinc-900 to-zinc-950 border border-emerald-500/30 text-emerald-400 shadow-2xl shadow-emerald-500/10">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Petrol Station Portal
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400">
              {mode === "register"
                ? "Create your Owner account to get started"
                : "Sign in to manage your petrol station operations"}
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">

          {/* Mode Tabs */}
          <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl bg-zinc-950/80 p-1.5 border border-zinc-800/80">
            <button
              type="button"
              id="tab-worker"
              onClick={() => handleModeChange("worker")}
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
              onClick={() => handleModeChange("owner")}
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
              onClick={() => handleModeChange("register")}
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

          {/* Status tagline bar */}
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

          {/* Error Alert */}
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

          {/* ===== WORKER LOGIN FORM ===== */}
          {mode === "worker" && (
            <form onSubmit={handleWorkerSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="workerIdentifier"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
                >
                  Phone Number or Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    {isWorkerEmail ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    )}
                  </div>
                  <input
                    id="workerIdentifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={workerIdentifier}
                    onChange={(e) => setWorkerIdentifier(e.target.value)}
                    placeholder="0300 1234567 or worker@email.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 font-mono tracking-wide focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  {isWorkerEmail ? "Signing in with email address." : "Enter phone number (digits only, spaces allowed)."}
                </p>
              </div>

              <div>
                <label
                  htmlFor="workerPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
                >
                  Password (پاس ورڈ)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="workerPassword"
                    name="password"
                    type={showWorkerPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={workerPassword}
                    onChange={(e) => setWorkerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-10 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showWorkerPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-worker-signin"
                  type="submit"
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In as Worker</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-center text-xs text-zinc-400">
                <span>Forgot credentials? </span>
                <span className="text-emerald-400 font-medium">Contact your Station Manager</span>
              </div>
            </form>
          )}

          {/* ===== OWNER LOGIN FORM ===== */}
          {mode === "owner" && (
            <form onSubmit={handleOwnerSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="ownerEmail"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
                >
                  Owner Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="ownerEmail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@petrolstation.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ownerPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
                >
                  Owner Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="ownerPassword"
                    name="password"
                    type={showOwnerPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-10 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showOwnerPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-owner-signin"
                  type="submit"
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-amber-600/20 hover:from-amber-500 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Signing In Owner...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In as Owner</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-center text-xs text-zinc-400">
                <span>New owner? </span>
                <button
                  type="button"
                  onClick={() => handleModeChange("register")}
                  className="text-amber-400 font-medium hover:underline cursor-pointer"
                >
                  Create an account →
                </button>
              </div>
            </form>
          )}

          {/* ===== OWNER REGISTRATION FORM ===== */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Info banner */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/8 px-4 py-3 text-xs text-indigo-300 flex items-start gap-2.5">
                <svg className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Creating an <strong>Owner account</strong> gives you full admin access — worker management, inventory, reports, and all financial data.</span>
              </div>

              <div>
                <label htmlFor="regName" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    id="regName"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="regEmail" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="regEmail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="owner@yourstation.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="regPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Password <span className="text-zinc-600 font-normal normal-case">(min 8 characters)</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="regPassword"
                    name="password"
                    type={showRegPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-10 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showRegPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="regPasswordConfirm" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    id="regPasswordConfirm"
                    name="passwordConfirm"
                    type={showRegPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className={`w-full rounded-xl border bg-zinc-950/90 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all ${
                      regPasswordConfirm && regPassword !== regPasswordConfirm
                        ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/30"
                    }`}
                  />
                </div>
                {regPasswordConfirm && regPassword !== regPasswordConfirm && (
                  <p className="mt-1 text-[11px] text-rose-400">Passwords do not match.</p>
                )}
              </div>

              <div className="pt-1">
                <button
                  id="btn-owner-register"
                  type="submit"
                  disabled={isPending || (Boolean(regPasswordConfirm) && regPassword !== regPasswordConfirm)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <>
                      <span>Create Owner Account</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-center text-xs text-zinc-400">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => handleModeChange("owner")}
                  className="text-indigo-400 font-medium hover:underline cursor-pointer"
                >
                  Sign in as Owner →
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-zinc-600">
          Petrol Station Management System &bull; Offline First &bull; Secure Authentication
        </p>
      </div>
    </div>
  );
}
