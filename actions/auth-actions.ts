"use server";

import { createClient } from "@/lib/supabase/server";
import { cleanPhoneNumber, phoneToWorkerEmail } from "@/lib/utils/phone";
import { redirect } from "next/navigation";

export interface AuthResponse {
  error?: string;
  success?: boolean;
}

/**
 * Server action to authenticate an Owner with email and password via Supabase.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail || !password) {
    return { error: "Email and password are required." };
  }

  let errorMessage: string | null = null;
  let targetUrl = "/";

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else {
        errorMessage = error.message;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { ensureUserProfile } = await import("@/lib/services/user-service");
        const profile = await ensureUserProfile(user);
        if (profile.role === "owner") {
          targetUrl = "/admin";
        } else {
          targetUrl = "/";
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorMessage = err.message;
    } else {
      errorMessage = "An unexpected error occurred during authentication.";
    }
  }

  if (errorMessage) {
    return { error: errorMessage };
  }

  redirect(targetUrl);
}

/**
 * Server action to authenticate a Worker with Phone Number and Password.
 * Programmatically appends the internal dummy domain (@pump.worker) under the hood.
 */
export async function loginWorker(phone: string, password: string): Promise<AuthResponse> {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned || cleaned.length < 7) {
    return { error: "Please enter a valid phone number (at least 7 digits)." };
  }

  if (!password) {
    return { error: "Password is required." };
  }

  const dummyEmail = phoneToWorkerEmail(cleaned);
  let errorMessage: string | null = null;
  let targetUrl = "/";

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("email not confirmed")
      ) {
        errorMessage = "Invalid phone number or password. Please verify with your station owner.";
      } else {
        errorMessage = error.message;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { ensureUserProfile } = await import("@/lib/services/user-service");
        const profile = await ensureUserProfile(user);
        if (profile.role === "owner") {
          targetUrl = "/admin";
        } else {
          targetUrl = "/";
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorMessage = err.message;
    } else {
      errorMessage = "An unexpected error occurred during worker authentication.";
    }
  }

  if (errorMessage) {
    return { error: errorMessage };
  }

  redirect(targetUrl);
}

/**
 * Server action to sign out the user via Supabase.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
