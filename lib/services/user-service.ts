import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Ensures that the authenticated user has a corresponding record in public.profiles.
 */
export async function ensureUserProfile(user: User) {
  if (!user?.id) return;
  try {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      const name =
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        `Worker ${user.id.slice(0, 6)}`;
      const role = user.user_metadata?.role || "worker";

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          name,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }
  } catch (err) {
    console.warn("Failed to ensure user profile:", err);
  }
}

/**
 * Service function to retrieve the currently authenticated user from Supabase.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureUserProfile(user);
  }

  return user;
}
