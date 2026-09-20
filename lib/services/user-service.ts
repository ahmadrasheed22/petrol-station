import { createClient } from "@/lib/supabase/server";

/**
 * Service function to retrieve the currently authenticated user from Supabase.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
