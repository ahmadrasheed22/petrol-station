"use client";

import type { FormEventHandler } from "react";

interface OwnerRegistrationFormProps {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  showPassword: boolean;
  isPending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onTogglePassword: () => void;
  onOwnerLogin: () => void;
}

export default function OwnerRegistrationForm({
  name,
  email,
  password,
  passwordConfirm,
  showPassword,
  isPending,
  onSubmit,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onTogglePassword,
  onOwnerLogin,
}: OwnerRegistrationFormProps) {
  const passwordsMismatch = Boolean(passwordConfirm) && password !== passwordConfirm;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/8 px-4 py-3 text-xs text-indigo-300 flex items-start gap-2.5">
        <svg className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Creating an <strong>Owner account</strong> gives you full admin access — worker management, inventory, reports, and all financial data.
        </span>
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
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
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
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
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
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-10 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
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
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(event) => onPasswordConfirmChange(event.target.value)}
            placeholder="Re-enter your password"
            className={`w-full rounded-xl border bg-zinc-950/90 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all ${
              passwordsMismatch
                ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/30"
            }`}
          />
        </div>
        {passwordsMismatch && <p className="mt-1 text-[11px] text-rose-400">Passwords do not match.</p>}
      </div>

      <div className="pt-1">
        <button
          id="btn-owner-register"
          type="submit"
          disabled={isPending || passwordsMismatch}
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
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-center text-xs text-zinc-400">
        <span>Already have an account? </span>
        <button type="button" onClick={onOwnerLogin} className="text-indigo-400 font-medium hover:underline cursor-pointer">
          Sign in as Owner →
        </button>
      </div>
    </form>
  );
}