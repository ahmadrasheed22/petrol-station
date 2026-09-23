import { createClient } from "@supabase/supabase-js";

/**
 * Creates an administrative Supabase client using the SUPABASE_SERVICE_ROLE_KEY.
 * This client bypasses Row Level Security (RLS) and email confirmations,
 * and allows provisioning worker accounts without affecting the active owner's browser session.
 */
export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
