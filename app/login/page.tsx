"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { login, loginWorker } from "@/actions/auth-actions";
import { createClient } from "@/lib/supabase/client";
import LoginModePanel, { type LoginPageMode } from "@/components/LoginModePanel";
import WorkerLoginForm from "@/components/WorkerLoginForm";
import OwnerLoginForm from "@/components/OwnerLoginForm";
import OwnerRegistrationForm from "@/components/OwnerRegistrationForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const emailConfirmed = searchParams.get("email-confirmed") === "1";
  const initialError =
    emailConfirmed
      ? "Your email has been verified. Please sign in."
      : oauthError === "owner-account-required"
        ? "Google sign-in is only available for an existing owner account. Workers must be created by an owner."
        : oauthError === "email-confirmation-failed"
          ? "This verification link is invalid or expired. Please ask your station owner for a new one."
          : oauthError === "email-not-confirmed"
            ? "Please verify your email address before accessing your account."
          : oauthError
            ? "Unable to sign in with Google. Please try again."
          : null;
  const [mode, setMode] = useState<LoginPageMode>(
    emailConfirmed || (oauthError && oauthError !== "email-confirmation-failed") ? "owner" : "worker"
  );
  const [workerIdentifier, setWorkerIdentifier] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (oauthError || emailConfirmed) window.history.replaceState({}, "", window.location.pathname);
  }, [emailConfirmed, oauthError]);

  const handleModeChange = (newMode: LoginPageMode) => {
    setMode(newMode);
    setError(null);
  };

  const handleWorkerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await loginWorker(workerIdentifier, workerPassword);
      if (result?.error) setError(result.error);
    } catch (err: unknown) {
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleOwnerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(ownerEmail, ownerPassword);
      if (result?.error) setError(result.error);
    } catch (err: unknown) {
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setIsGoogleLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to continue with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const isWorkerEmail = workerIdentifier.includes("@");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100 selection:bg-emerald-500 selection:text-white">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[130px]" />
        <div className="h-[350px] w-[350px] rounded-full bg-amber-500/5 blur-[100px]" />
        <div className="absolute top-0 right-0 h-[250px] w-[250px] rounded-full bg-indigo-500/4 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-lg space-y-6">
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

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <LoginModePanel mode={mode} error={error} onModeChange={handleModeChange} />

          {mode === "worker" && (
            <WorkerLoginForm
              identifier={workerIdentifier}
              password={workerPassword}
              isEmail={isWorkerEmail}
              showPassword={showWorkerPassword}
              isPending={isLoading}
              onSubmit={handleWorkerSubmit}
              onIdentifierChange={setWorkerIdentifier}
              onPasswordChange={setWorkerPassword}
              onTogglePassword={() => setShowWorkerPassword((visible) => !visible)}
            />
          )}

          {mode === "owner" && (
            <OwnerLoginForm
              email={ownerEmail}
              password={ownerPassword}
              showPassword={showOwnerPassword}
              isPending={isLoading}
              onSubmit={handleOwnerSubmit}
              onEmailChange={setOwnerEmail}
              onPasswordChange={setOwnerPassword}
              onTogglePassword={() => setShowOwnerPassword((visible) => !visible)}
              onRegister={() => handleModeChange("register")}
              onGoogleSignIn={handleGoogleSignIn}
              isGooglePending={isGoogleLoading}
            />
          )}

          {mode === "register" && (
            <OwnerRegistrationForm
              onError={setError}
              onOwnerLogin={() => handleModeChange("owner")}
            />
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-600">
          Petrol Station Management System &bull; Offline First &bull; Secure Authentication
        </p>
      </div>
    </div>
  );
}