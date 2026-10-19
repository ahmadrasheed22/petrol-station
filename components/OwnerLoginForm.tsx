"use client";

import type { FormEventHandler } from "react";

interface OwnerLoginFormProps {
  email: string;
  password: string;
  showPassword: boolean;
  isPending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onRegister: () => void;
  onGoogleSignIn: () => void;
  isGooglePending: boolean;
}

export default function OwnerLoginForm({
  email,
  password,
  showPassword,
  isPending,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onRegister,
  onGoogleSignIn,
  isGooglePending,
}: OwnerLoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={isPending || isGooglePending}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.65 5.94c4.46-4.12 7.13-10.18 7.13-17.59Z" />
          <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.86l-7.65-5.94c-2.13 1.43-4.86 2.27-8.25 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        {isGooglePending ? "Connecting to Google..." : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        <span className="h-px flex-1 bg-zinc-800" />
        or continue with email
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <div>
        <label htmlFor="ownerEmail" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
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
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="owner@petrolstation.com"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
          />
        </div>
      </div>

      <div>
        <label htmlFor="ownerPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
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
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 pl-10 pr-10 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
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
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-center text-xs text-zinc-400">
        <span>New owner? </span>
        <button type="button" onClick={onRegister} className="text-amber-400 font-medium hover:underline cursor-pointer">
          Create an account →
        </button>
      </div>
    </form>
  );
}