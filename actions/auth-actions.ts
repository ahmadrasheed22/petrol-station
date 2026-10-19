"use server";

import { createClient } from "@/lib/supabase/server";
import { cleanPhoneNumber, phoneToWorkerEmail } from "@/lib/utils/phone";
import { redirect } from "next/navigation";

export interface AuthResponse {
  error?: string;
  success?: boolean;
}

type UserRole = "owner" | "worker";

type PortalLoginResult = { error: string } | { targetUrl: string };

async function clearRejectedLoginSession(client: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { error } = await client.auth.signOut();
    if (error) {
      console.error("Could not clear rejected login session:", error.message);
    }
  } catch (err: unknown) {
    console.error(
      "Could not clear rejected login session:",
      err instanceof Error ? err.message : "Unknown sign-out error."
    );
  }
}

async function authenticateForPortal(
  email: string,
  password: string,
  expectedRole: UserRole,
  invalidCredentialsMessage: string
): Promise<PortalLoginResult> {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let sessionCreated = false;

  try {
    const client = await createClient();
    supabase = client;
    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      const normalizedError = error.message.toLowerCase();
      if (error.code === "email_not_confirmed" || normalizedError.includes("email not confirmed")) {
        return { error: "Please check your inbox to verify your email before logging in." };
      }
      if (normalizedError.includes("invalid login credentials")) {
        return { error: invalidCredentialsMessage };
      }
      return { error: error.message };
    }
    sessionCreated = true;

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    const rejectLogin = async (message: string): Promise<PortalLoginResult> => {
      await clearRejectedLoginSession(client);
      sessionCreated = false;
      return { error: message };
    };

    if (userError || !user) {
      return rejectLogin("Unable to verify your account. Please try again.");
    }

    if (!user.email_confirmed_at) {
      return rejectLogin("Please check your inbox to verify your email before logging in.");
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Could not verify login role:", profileError.message);
      return rejectLogin("Unable to verify your account role. Please try again.");
    }
    if (!profile || (profile.role !== "owner" && profile.role !== "worker")) {
      return rejectLogin("Unable to verify your account role. Please contact support.");
    }
    if (profile.role !== expectedRole) {
      const portalMessage =
        profile.role === "owner"
          ? "Invalid login portal. Please use the Owner tab."
          : "Invalid login portal. Please use the Worker tab.";
      return rejectLogin(portalMessage);
    }

    return { targetUrl: expectedRole === "owner" ? "/admin" : "/" };
  } catch (err: unknown) {
    if (supabase && sessionCreated) {
      await clearRejectedLoginSession(supabase);
    }
    return {
      error: err instanceof Error
        ? err.message
        : "An unexpected error occurred during authentication.",
    };
  }
}

/**
 * Server action to authenticate an Owner with email and password via Supabase.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail || !password) {
    return { error: "Email and password are required." };
  }

  const result = await authenticateForPortal(
    trimmedEmail,
    password,
    "owner",
    "Invalid email or password. Please check your credentials."
  );
  if ("error" in result) return result;
  redirect(result.targetUrl);
}

/**
 * Server action to authenticate a Worker.
 * Accepts either a Phone Number or a real Email address.
 * - Phone (no "@"): strips non-digits and appends @pump.worker internally.
 * - Email (contains "@"): signs in directly with the real email.
 */
export async function loginWorker(identifier: string, password: string): Promise<AuthResponse> {
  const trimmed = identifier?.trim();

  if (!trimmed) {
    return { error: "Please enter your phone number or email address." };
  }
  if (!password) {
    return { error: "Password is required." };
  }

  // Detect if input is an email or a phone number
  const isEmailInput = trimmed.includes("@");

  let loginEmail: string;

  if (isEmailInput) {
    loginEmail = trimmed.toLowerCase();
  } else {
    // Phone path: clean and convert to internal dummy email
    const cleaned = cleanPhoneNumber(trimmed);
    if (!cleaned || cleaned.length < 7) {
      return { error: "Please enter a valid phone number (at least 7 digits)." };
    }
    loginEmail = phoneToWorkerEmail(cleaned);
  }

  const result = await authenticateForPortal(
    loginEmail,
    password,
    "worker",
    isEmailInput
      ? "Invalid email or password. Please verify with your station owner."
      : "Invalid phone number or password. Please verify with your station owner."
  );
  if ("error" in result) return result;
  redirect(result.targetUrl);
}

/**
 * Server action to sign out the user via Supabase.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
