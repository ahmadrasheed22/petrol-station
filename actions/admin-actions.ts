"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { cleanPhoneNumber, phoneToWorkerEmail, isWorkerEmail, workerEmailToPhone, formatPhoneDisplay } from "@/lib/utils/phone";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAdminOverviewDataService } from "@/actions/admin-overview-service";

export interface CreateWorkerInput {
  name: string;
  /** Phone number (digits, Pakistani format) — used if email is absent */
  phone?: string;
  /** Real email address — if provided, worker logs in with this instead of phone */
  email?: string;
  password: string;
}

export interface WorkerItem {
  id: string;
  name: string;
  /** Formatted phone number (shown when worker uses phone auth) */
  phone?: string;
  /** Real email (shown when worker uses email auth) */
  email?: string;
  /** The credential the worker uses to log in */
  loginId?: string;
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
 * Requires email verification for email accounts; phone-based accounts use an internal
 * dummy domain and are confirmed because they have no email address to verify.
 */
export async function createWorkerAccount(input: CreateWorkerInput): Promise<{
  success: boolean;
  error?: string;
  user?: { id: string; loginId: string; name: string; emailVerificationRequired: boolean };
}> {
  try {
    // 1. Authorize against the stored profile role, not user-editable auth metadata.
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "Unauthorized. Only station owners have permission to create worker accounts.",
      };
    }

    const { data: profile, error: authProfileError } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (authProfileError) {
      console.error("Could not verify worker-creation permissions:", authProfileError.message);
      return {
        success: false,
        error: "Unable to verify your permissions. Please try again.",
      };
    }
    if (profile?.role !== "owner") {
      return {
        success: false,
        error: "Unauthorized. Only station owners have permission to create worker accounts.",
      };
    }

    // 2. Validate inputs
    const name = input.name?.trim();
    const rawEmail = input.email?.trim().toLowerCase() || "";
    const rawPhone = input.phone?.trim() || "";
    const password = input.password;

    if (!name || name.length < 2) {
      return { success: false, error: "Worker name must be at least 2 characters." };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    // Determine login credential: real email takes priority over phone
    const useEmail = rawEmail && rawEmail.includes("@");
    const cleanPhone = useEmail ? "" : cleanPhoneNumber(rawPhone);

    if (!useEmail && (!cleanPhone || cleanPhone.length < 7)) {
      return {
        success: false,
        error: "Please provide either a valid email address or a phone number (at least 7 digits).",
      };
    }

    let emailRedirectTo: string | undefined;
    if (useEmail) {
      const origin = (await headers()).get("origin");
      if (!origin) {
        return {
          success: false,
          error: "Unable to determine the app URL for the worker verification email. Please try again.",
        };
      }
      const originUrl = new URL(origin);
      if (originUrl.protocol !== "https:" && !(originUrl.protocol === "http:" && originUrl.hostname === "localhost")) {
        return { success: false, error: "Worker email verification requires a secure app URL." };
      }
      emailRedirectTo = new URL("/auth/confirm", originUrl).toString();
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

    // 4. Determine the email to use in Supabase Auth
    const authEmail = useEmail ? rawEmail : phoneToWorkerEmail(cleanPhone);
    const loginId = useEmail ? rawEmail : formatPhoneDisplay(cleanPhone);

    // 5. Create user via Supabase Admin Auth without changing the active owner's session.
    const userMetadata: Record<string, string> = { name, role: "worker" };
    if (!useEmail) userMetadata.phone = cleanPhone;

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: !useEmail,
      user_metadata: userMetadata,
    });

    if (createError || !createData.user) {
      let friendlyError = createError?.message || "Failed to create worker account in Supabase Auth.";
      if (friendlyError.toLowerCase().includes("already registered")) {
        friendlyError = useEmail
          ? `A worker account with email "${rawEmail}" already exists.`
          : `A worker account with phone number "${formatPhoneDisplay(cleanPhone)}" already exists.`;
      }
      return { success: false, error: friendlyError };
    }

    const newUserId = createData.user.id;

    const cleanUpCreatedAccount = async () => {
      const { error: profileCleanupError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", newUserId);
      const { error: userCleanupError } = await adminClient.auth.admin.deleteUser(newUserId);

      if (profileCleanupError) {
        console.error("Could not remove worker profile after account creation failed:", profileCleanupError.message);
      }
      if (userCleanupError) {
        console.error("Could not remove worker auth user after account creation failed:", userCleanupError.message);
      }
    };

    // 6. Ensure profile entry exists with role = 'worker'
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
      await cleanUpCreatedAccount();
      return { success: false, error: `Could not create the worker profile: ${profileError.message}` };
    }

    if (useEmail) {
      const { error: confirmationError } = await authClient.auth.resend({
        type: "signup",
        email: rawEmail,
        options: { emailRedirectTo },
      });

      if (confirmationError) {
        await cleanUpCreatedAccount();
        return {
          success: false,
          error: `The worker account was not kept because its confirmation email could not be sent: ${confirmationError.message}`,
        };
      }
    }

    revalidatePath("/admin/workers");
    revalidatePath("/admin");

    return {
      success: true,
      user: { id: newUserId, loginId, name, emailVerificationRequired: Boolean(useEmail) },
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
 * Combines Supabase Auth users (for phone/email & sign-in timestamps) and public.profiles.
 * Never exposes the internal @pump.worker dummy domain.
 */
export async function getWorkersList(): Promise<WorkerItem[]> {
  try {
    const auth = await getAuthenticatedUserProfile();
    if (!auth || auth.profile.role !== "owner") {
      return [];
    }

    const adminClient = getAdminClient();

    if (!adminClient) {
      console.error("Cannot verify worker email status without the Supabase service role key.");
      return [];
    }

    const { data: profilesData, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, name, role, created_at")
      .eq("role", "worker");
    if (profilesError) {
      throw new Error(`Could not load worker profiles: ${profilesError.message}`);
    }

    const profilesMap = new Map((profilesData || []).map((profile) => [profile.id, profile]));
    const authUsers = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
      if (error) {
        throw new Error(`Could not load authentication users: ${error.message}`);
      }
      authUsers.push(...data.users);
      if (data.users.length < 100) break;
    }

    const workers: WorkerItem[] = [];
    for (const user of authUsers) {
      const profile = profilesMap.get(user.id);

      const hasVerifiedEmail =
        Boolean(user.email_confirmed_at) &&
        (isWorkerEmail(user.email) || Boolean(user.confirmation_sent_at));
      if (profile?.role !== "worker" || !hasVerifiedEmail) continue;

      const rawEmail = user.email || "";
      const isDummy = isWorkerEmail(rawEmail);
      const phone = user.user_metadata?.phone || (isDummy ? workerEmailToPhone(rawEmail) : undefined);

      workers.push({
        id: user.id,
        name: profile.name || user.user_metadata?.name || "Worker",
        phone: phone ? formatPhoneDisplay(phone) : undefined,
        email: isDummy ? undefined : user.email,
        role: "worker",
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at || undefined,
      });
    }

    return workers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    console.error("Error fetching workers list:", err);
    return [];
  }
}

/**
 * Retrieves aggregated metrics and recent shifts for the Owner's Admin Overview.
 */
export async function getAdminOverviewData(): Promise<OverviewStats> {
  return getAdminOverviewDataService();
}
