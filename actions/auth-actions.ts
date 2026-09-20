"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthResponse {
  error?: string;
  success?: boolean;
}

/**
 * Server action to authenticate user with email and password via Supabase.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let errorMessage: string | null = null;

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorMessage = error.message;
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

  redirect("/");
}
