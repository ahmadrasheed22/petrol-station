"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { createClient } from "@/lib/supabase/server";

export interface ActiveFuelTank {
  id: string;
  tank_number: string;
  fuel_type: string;
  capacity_liters: number;
  current_liters: number;
}

export interface TankerArrivalRecord {
  id: string;
  received_liters: number;
  total_amount: number;
  arrived_at: string;
  created_at: string;
  tank: { tank_number: string; fuel_type: string }[];
}

async function isOwner() {
  const auth = await getAuthenticatedUserProfile();
  return auth?.profile.role === "owner";
}

export async function getTankerArrivalData(): Promise<{
  tanks: ActiveFuelTank[];
  arrivals: TankerArrivalRecord[];
  error: string | null;
}> {
  if (!(await isOwner())) {
    return { tanks: [], arrivals: [], error: "Unauthorized." };
  }

  const supabase = await createClient();
  const [tanksResult, arrivalsResult] = await Promise.all([
    supabase
      .from("fuel_tanks")
      .select("id, tank_number, fuel_type, capacity_liters, current_liters")
      .eq("status", "active")
      .order("tank_number"),
    supabase
      .from("tanker_arrivals")
      .select("id, received_liters, total_amount, arrived_at, created_at, tank:fuel_tanks(tank_number, fuel_type)")
      .order("arrived_at", { ascending: false })
      .limit(25),
  ]);

  return {
    tanks: (tanksResult.data || []) as ActiveFuelTank[],
    arrivals: (arrivalsResult.data || []) as TankerArrivalRecord[],
    error: tanksResult.error?.message || arrivalsResult.error?.message || null,
  };
}

export async function recordTankerArrival(input: {
  tankId: string;
  receivedLiters: number;
  totalAmount: number;
  arrivedAt: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!(await isOwner())) {
    return { success: false, error: "Unauthorized. Only station owners can record tanker arrivals." };
  }

  if (
    typeof input?.tankId !== "string" ||
    !input.tankId ||
    !Number.isFinite(input.receivedLiters) ||
    input.receivedLiters <= 0 ||
    !Number.isFinite(input.totalAmount) ||
    input.totalAmount <= 0 ||
    typeof input.arrivedAt !== "string" ||
    !Number.isFinite(Date.parse(input.arrivedAt))
  ) {
    return { success: false, error: "Enter a valid tank, received volume, invoice amount, and arrival date." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_tanker_arrival", {
    p_tank_id: input.tankId,
    p_received_liters: input.receivedLiters,
    p_total_amount: input.totalAmount,
    p_arrived_at: new Date(input.arrivedAt).toISOString(),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/tanker-arrivals");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/pump-config");
  return { success: true };
}