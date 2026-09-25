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
 * Server action to register a new Owner account.
 * Creates the Supabase Auth user and immediately sets role = 'owner' in public.profiles.
 */
export async function registerOwner(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim().toLowerCase();

  if (!trimmedName || trimmedName.length < 2) {
    return { error: "Name must be at least 2 characters." };
  }
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { error: "Please enter a valid email address." };
  }
  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  let errorMessage: string | null = null;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          role: "owner",
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else {
        errorMessage = error.message;
      }
    } else if (data.user) {
      // Immediately upsert profile with owner role in case the trigger hasn't fired yet
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          name: trimmedName,
          role: "owner",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorMessage = err.message;
    } else {
      errorMessage = "An unexpected error occurred during registration.";
    }
  }

  if (errorMessage) {
    return { error: errorMessage };
  }

  redirect("/admin");
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

  let errorMessage: string | null = null;
  let targetUrl = "/";

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("email not confirmed")
      ) {
        errorMessage = isEmailInput
          ? "Invalid email or password. Please verify with your station owner."
          : "Invalid phone number or password. Please verify with your station owner.";
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
