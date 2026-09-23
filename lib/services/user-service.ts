import { createClient } from "@/lib/supabase/server";
import { isWorkerEmail, workerEmailToPhone, formatPhoneDisplay } from "@/lib/utils/phone";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  name: string;
  role: "owner" | "worker";
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthenticatedUserWithProfile {
  user: User;
  profile: UserProfile;
}

/**
 * Ensures that the authenticated user has a corresponding record in public.profiles
 * and returns the full profile record.
 */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const isDummy = isWorkerEmail(user.email);
  const rawPhone = user.user_metadata?.phone || (isDummy ? workerEmailToPhone(user.email) : undefined);
  const phone = rawPhone ? formatPhoneDisplay(rawPhone) : undefined;
  const publicEmail = isDummy ? undefined : user.email;

  const fallbackName =
    user.user_metadata?.name ||
    (phone ? `Worker (${phone})` : user.email?.split("@")[0]) ||
    `Worker ${user.id.slice(0, 6)}`;
  const fallbackRole = (user.user_metadata?.role as "owner" | "worker") || "worker";

  try {
    const supabase = await createClient();
    const { data: existing, error } = await supabase
      .from("profiles")
      .select("id, name, role, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && existing) {
      return {
        id: existing.id,
        name: existing.name || fallbackName,
        role: (existing.role as "owner" | "worker") || fallbackRole,
        email: publicEmail,
        phone,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
      };
    }

    const newProfile = {
      id: user.id,
      name: fallbackName,
      role: fallbackRole,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("profiles").upsert(newProfile, { onConflict: "id" });

    return {
      ...newProfile,
      email: publicEmail,
      phone,
    };
  } catch (err) {
    console.warn("Failed to ensure user profile:", err);
    return {
      id: user.id,
      name: fallbackName,
      role: fallbackRole,
      email: publicEmail,
      phone,
    };
  }
}

/**
 * Service function to retrieve the profile of a given user ID from Supabase.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, role, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        role: data.role as "owner" | "worker",
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
    return null;
  } catch (err) {
    console.warn("Failed to get user profile by ID:", err);
    return null;
  }
}

/**
 * Service function to retrieve the currently authenticated user from Supabase.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureUserProfile(user);
  }

  return user;
}

/**
 * Service function to retrieve both the authenticated user and their profile (name, role).
 * Use this in server components to avoid displaying raw UUIDs and access the role for routing.
 */
export async function getAuthenticatedUserProfile(): Promise<AuthenticatedUserWithProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await ensureUserProfile(user);
  return { user, profile };
}

/**
 * Helper to get the role of the currently logged in user ('owner' vs 'worker').
 */
export async function getCurrentUserRole(): Promise<"owner" | "worker"> {
  const auth = await getAuthenticatedUserProfile();
  return auth?.profile.role || "worker";
}
