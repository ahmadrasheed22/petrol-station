"use client";

import { useEffect, useState, type FormEventHandler } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RegistrationStep = 1 | 2 | 3;

interface OwnerRegistrationFormProps {
  onError: (message: string | null) => void;
  onOwnerLogin: () => void;
}

const inputClassName =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";
const RESEND_COOLDOWN_SECONDS = 60;

export default function OwnerRegistrationForm({
  onError,
  onOwnerLogin,
}: OwnerRegistrationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<RegistrationStep>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (resendCooldown === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setResendCooldown((remaining) => Math.max(remaining - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  useEffect(() => {
    if (!resendMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setResendMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [resendMessage]);

  const requestVerificationCode = (targetEmail: string) => {
    const supabase = createClient();
    return supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        data: { full_name: name.trim(), role: "owner" },
      },
    });
  };

  const handleResendCode = async () => {
    onError(null);
    setResendMessage("");
    setIsResending(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error: otpError } = await requestVerificationCode(normalizedEmail);

      if (otpError) {
        onError(otpError.message);
        return;
      }

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResendMessage("Code resent successfully");
    } catch (err: unknown) {
      onError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while resending the code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    onError(null);

    if (step === 1 && name.trim().length < 2) {
      onError("Name must be at least 2 characters.");
      return;
    }

    setIsPending(true);

    try {
      if (step === 1) {
        const normalizedEmail = email.trim().toLowerCase();
        const { error: otpError } = await requestVerificationCode(normalizedEmail);

        if (otpError) {
          onError(otpError.message);
          return;
        }

        setEmail(normalizedEmail);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setStep(2);
        return;
      }

      const supabase = createClient();

      if (step === 2) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: code,
          type: "email",
        });

        if (verifyError) {
          onError(verifyError.message);
          return;
        }
        if (!data.user || !data.session) {
          onError("Unable to verify your account. Please request a new code and try again.");
          return;
        }

        setStep(3);
        return;
      }

      if (password !== passwordConfirm) {
        onError("Passwords do not match.");
        return;
      }

      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        onError(passwordError.message);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (err: unknown) {
      onError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during registration. Please try again."
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <span>Owner registration</span>
          <span>Step {step} of 3</span>
        </div>
        <div className="flex gap-2" aria-label={`Registration step ${step} of 3`}>
          {[1, 2, 3].map((stepNumber) => (
            <span
              key={stepNumber}
              className={`h-1.5 flex-1 rounded-full ${
                stepNumber <= step ? "bg-indigo-500" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <label htmlFor="regName" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Full Name
              </label>
              <input
                id="regName"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Muhammad Ali"
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="regEmail" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <input
                id="regEmail"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@yourstation.com"
                className={inputClassName}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-white">Verify your email</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Enter the 8-digit verification code sent to {email}.
              </p>
            </div>
            <div>
              <label htmlFor="verificationCode" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Verification Code
              </label>
              <input
                id="verificationCode"
                name="verificationCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={8}
                maxLength={8}
                pattern="[0-9]{8}"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\s/g, "").replace(/\D/g, "").slice(0, 8))
                }
                placeholder="00000000"
                aria-describedby="verificationCodeHint"
                className={`${inputClassName} text-center text-xl tracking-[0.5em]`}
              />
              <p id="verificationCodeHint" className="mt-1.5 text-xs text-zinc-500">
                Use the 8-digit code from your email.
              </p>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isPending || isResending || resendCooldown > 0}
                  className="font-medium text-indigo-400 hover:underline disabled:cursor-not-allowed disabled:text-zinc-500 disabled:no-underline"
                >
                  {isResending
                    ? "Resending..."
                    : resendCooldown > 0
                      ? `Resend Code in ${resendCooldown}s`
                      : "Resend Code"}
                </button>
                {resendMessage && (
                  <p role="status" aria-live="polite" className="text-emerald-400">
                    {resendMessage}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-white">Set your password</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Your email is verified. Choose a password to secure your account.
              </p>
            </div>
            <div>
              <label htmlFor="regPassword" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Password <span className="font-normal normal-case text-zinc-600">(min 8 characters)</span>
              </label>
              <input
                id="regPassword"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="regPasswordConfirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Confirm Password
              </label>
              <input
                id="regPasswordConfirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="Re-enter your password"
                className={inputClassName}
              />
              {passwordConfirm && password !== passwordConfirm && (
                <p className="mt-1 text-[11px] text-rose-400">Passwords do not match.</p>
              )}
            </div>
          </>
        )}

        <button
          id="btn-owner-register"
          type="submit"
          disabled={
            isPending ||
            isResending ||
            (step === 2 && code.length < 8) ||
            (step === 3 && password !== passwordConfirm)
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? step === 1
              ? "Sending Code..."
              : step === 2
                ? "Verifying Code..."
                : "Saving Password..."
            : step === 1
              ? "Send Verification Code"
              : step === 2
                ? "Verify Code"
                : "Save Password & Login"}
        </button>
      </form>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-center text-xs text-zinc-400">
        <span>Already have an account? </span>
        <button type="button" onClick={onOwnerLogin} className="cursor-pointer font-medium text-indigo-400 hover:underline">
          Sign in as Owner
        </button>
      </div>
    </div>
  );
}
