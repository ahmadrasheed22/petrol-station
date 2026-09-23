"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { revalidatePath } from "next/cache";

export interface CreateWorkerInput {
  name: string;
  email: string;
  password: string;
}

export interface WorkerItem {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in?: string;
}

export interface OverviewStats {
  totalWorkers: number;
  totalShifts: number;
  todayLiters: number;
  todayExpectedCash: number;
  todayActualCash: number;
  todayShortageAmount: number;
  recentShifts: Array<{
    id: string;
    worker_id: string;
    worker_name?: string;
    product_name?: string;
    start_time: string;
    end_time?: string;
    opening_meter: number;
    closing_meter: number;
    testing_liters: number;
    total_liters: number;
    price_per_liter: number;
    expected_cash: number;
    actual_cash: number;
    shortage_amount: number;
  }>;
}

/**
 * Checks whether the SUPABASE_SERVICE_ROLE_KEY is present in the environment.
 */
export async function isServiceRoleConfigured(): Promise<boolean> {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0);
}

/**
 * Creates a new worker user account securely using the Supabase Service Role Key (Admin API).
 * Bypasses email verification, assigns role 'worker', and preserves the active Owner's session.
 */
export async function createWorkerAccount(input: CreateWorkerInput): Promise<{
  success: boolean;
  error?: string;
  user?: { id: string; email: string; name: string };
}> {
  try {
    // 1. Authorize: Ensure caller is an authenticated Owner
    const auth = await getAuthenticatedUserProfile();
    if (!auth || auth.profile.role !== "owner") {
      return {
        success: false,
        error: "Unauthorized. Only station owners have permission to create worker accounts.",
      };
    }

    // 2. Validate inputs
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password;

    if (!name || name.length < 2) {
      return { success: false, error: "Worker name must be at least 2 characters." };
    }
    if (!email || !email.includes("@")) {
      return { success: false, error: "A valid email address is required." };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    // 3. Obtain Admin Client with Service Role Key
    const adminClient = getAdminClient();
    if (!adminClient) {
      return {
        success: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local. Please add your Supabase Service Role Key to create worker accounts seamlessly.",
      };
    }

    // 4. Create user via Supabase Admin Auth (auto-confirms email, does not affect active session)
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: "worker",
      },
    });

    if (createError || !createData.user) {
      return {
        success: false,
        error: createError?.message || "Failed to create worker account in Supabase Auth.",
      };
    }

    const newUserId = createData.user.id;

    // 5. Ensure profile entry exists with role = 'worker'
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: newUserId,
        name,
        role: "worker",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.warn("Could not upsert profile after user creation:", profileError.message);
    }

    revalidatePath("/admin/workers");
    revalidatePath("/admin");

    return {
      success: true,
      user: {
        id: newUserId,
        email,
        name,
      },
    };
  } catch (err: unknown) {
    console.error("Error in createWorkerAccount:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected server error occurred.",
    };
  }
}

/**
 * Retrieves the list of all worker accounts.
 * Combines Supabase Auth users (for email & sign-in timestamps) and public.profiles.
 */
export async function getWorkersList(): Promise<WorkerItem[]> {
  try {
    const auth = await getAuthenticatedUserProfile();
    if (!auth || auth.profile.role !== "owner") {
      return [];
    }

    const adminClient = getAdminClient();

    if (adminClient) {
      // Use Admin Client to get both auth users and profiles
      const [{ data: usersData }, { data: profilesData }] = await Promise.all([
        adminClient.auth.admin.listUsers({ page: 1, perPage: 100 }),
        adminClient.from("profiles").select("id, name, role, created_at"),
      ]);

      const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

      const workers: WorkerItem[] = [];
      for (const u of usersData?.users || []) {
        const prof = profilesMap.get(u.id);
        const role = prof?.role || u.user_metadata?.role || "worker";
        const name = prof?.name || u.user_metadata?.name || u.email?.split("@")[0] || "Worker";

        // Include workers
        if (role === "worker") {
          workers.push({
            id: u.id,
            name,
            email: u.email || "",
            role: "worker",
            created_at: u.created_at,
            last_sign_in: u.last_sign_in_at || undefined,
          });
        }
      }

      // Sort by creation date descending
      return workers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Fallback if Service Role Key is not yet configured: fetch from profiles table via standard client
    const supabase = await createClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, role, created_at")
      .eq("role", "worker")
      .order("created_at", { ascending: false });

    return (profiles || []).map((p) => ({
      id: p.id,
      name: p.name || "Worker",
      email: "Protected (Set Service Role Key to view)",
      role: p.role,
      created_at: p.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Error fetching workers list:", err);
    return [];
  }
}

/**
 * Retrieves aggregated metrics and recent shifts for the Owner's Admin Overview.
 */
export async function getAdminOverviewData(): Promise<OverviewStats> {
  const fallback: OverviewStats = {
    totalWorkers: 0,
    totalShifts: 0,
    todayLiters: 0,
    todayExpectedCash: 0,
    todayActualCash: 0,
    todayShortageAmount: 0,
    recentShifts: [],
  };

  try {
    const supabase = await createClient();

    // Fetch workers count
    const { count: workersCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker");

    // Fetch shifts and worker profiles
    const { data: shifts, count: shiftsCount } = await supabase
      .from("shifts")
      .select(
        `
        id,
        worker_id,
        start_time,
        end_time,
        opening_meter,
        closing_meter,
        testing_liters,
        total_liters,
        price_per_liter,
        expected_cash,
        actual_cash,
        shortage_amount,
        product_name,
        profiles (
          name
        )
      `
      )
      .order("start_time", { ascending: false })
      .limit(20);

    const formattedShifts = (shifts || []).map((s: any) => ({
      id: s.id,
      worker_id: s.worker_id,
      worker_name: s.profiles?.name || `Worker (${s.worker_id?.slice(0, 6) || "Unknown"})`,
      product_name: s.product_name || "Fuel",
      start_time: s.start_time,
      end_time: s.end_time,
      opening_meter: Number(s.opening_meter || 0),
      closing_meter: Number(s.closing_meter || 0),
      testing_liters: Number(s.testing_liters || 0),
      total_liters: Number(s.total_liters || 0),
      price_per_liter: Number(s.price_per_liter || 0),
      expected_cash: Number(s.expected_cash || 0),
      actual_cash: Number(s.actual_cash || 0),
      shortage_amount: Number(s.shortage_amount || 0),
    }));

    // Aggregate today's shifts (or all recent shifts)
    const today = new Date().toISOString().slice(0, 10);
    const todayShifts = formattedShifts.filter((s) => s.start_time.startsWith(today));

    // If no shifts today yet, aggregate across recent shifts for demo/historical metrics
    const sampleSet = todayShifts.length > 0 ? todayShifts : formattedShifts.slice(0, 10);

    const todayLiters = sampleSet.reduce((acc, s) => acc + s.total_liters, 0);
    const todayExpectedCash = sampleSet.reduce((acc, s) => acc + s.expected_cash, 0);
    const todayActualCash = sampleSet.reduce((acc, s) => acc + s.actual_cash, 0);
    const todayShortageAmount = sampleSet.reduce((acc, s) => acc + s.shortage_amount, 0);

    return {
      totalWorkers: workersCount || 0,
      totalShifts: shiftsCount || formattedShifts.length,
      todayLiters,
      todayExpectedCash,
      todayActualCash,
      todayShortageAmount,
      recentShifts: formattedShifts,
    };
  } catch (err) {
    console.error("Error getting admin overview data:", err);
    return fallback;
  }
}
