"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";

export interface TankerDeliveryLog {
  id: string;
  created_at: string;
  billed_liters: number;
  actual_received_liters: number;
  cost_per_liter: number;
  product_name: string;
  received_by_worker_name: string;
}

export async function getTankerDeliveryLogs(): Promise<{
  logs: TankerDeliveryLog[];
  error: string | null;
}> {
  const auth = await getAuthenticatedUserProfile();
  if (auth?.profile.role !== "owner") {
    return { logs: [], error: "Unauthorized." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_arrivals")
    .select(
      "id, created_at, billed_liters, actual_received_liters, cost_per_liter, product:products(name), worker:profiles!inventory_arrivals_received_by_fkey(name)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getTankerDeliveryLogs error:", error.message);
    return { logs: [], error: error.message };
  }

  const logs: TankerDeliveryLog[] = (data ?? []).map((row) => {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    const worker = Array.isArray(row.worker) ? row.worker[0] : row.worker;
    return {
      id: row.id as string,
      created_at: row.created_at as string,
      billed_liters: Number(row.billed_liters ?? 0),
      actual_received_liters: Number(row.actual_received_liters ?? 0),
      cost_per_liter: Number(row.cost_per_liter ?? 0),
      product_name: (product as { name?: string } | null)?.name ?? "—",
      received_by_worker_name:
        (worker as { name?: string } | null)?.name ?? "—",
    };
  });

  return { logs, error: null };
}

export async function getLiveTanks(): Promise<{
  tanks: import("@/components/TankStatusCard").TankStatusData[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fuel_tanks")
    .select("id, tank_number, fuel_type, capacity_liters, current_liters, current_volume")
    .order("tank_number", { ascending: true });

  if (error) {
    console.error("getLiveTanks error:", error.message);
    return { tanks: [], error: error.message };
  }

  const tanks: import("@/components/TankStatusCard").TankStatusData[] = (
    data ?? []
  ).map((row) => {
    const fuelTypeLower = (row.fuel_type || "").toLowerCase();
    const isPetrol = fuelTypeLower.includes("petrol") || fuelTypeLower.includes("super");
    const isDiesel = fuelTypeLower.includes("diesel") || fuelTypeLower.includes("hsd");

    let color = {
      bar: "from-indigo-500 to-purple-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      text: "text-indigo-400",
      glow: "shadow-indigo-500/20",
    };

    if (isPetrol) {
      color = {
        bar: "from-emerald-500 to-teal-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        glow: "shadow-emerald-500/20",
      };
    } else if (isDiesel) {
      color = {
        bar: "from-amber-500 to-orange-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-400",
        glow: "shadow-amber-500/20",
      };
    }

    const currentVolume = Number(row.current_volume ?? row.current_liters);
    const capacity = Number(row.capacity_liters);

    return {
      id: row.id,
      name: row.tank_number,
      fuelType: row.fuel_type,
      capacityLiters: capacity,
      currentLiters: currentVolume,
      color,
      temperatureC: null,
      waterBottomMm: null,
    };
  });

  return { tanks, error: null };
}

export async function revalidateInventoryLogs(): Promise<void> {
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory-logs");
}

export async function clearInventoryTestData(): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await getAuthenticatedUserProfile();
  if (auth?.profile.role !== "owner") {
    return {
      success: false,
      error: "Unauthorized. Only station owners can reset test data.",
    };
  }

  const supabase = await createClient();

  // 1. Wipe all records from inventory_arrivals
  const { error: deleteArrivalsError } = await supabase
    .from("inventory_arrivals")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteArrivalsError) {
    console.error("clearInventoryTestData delete arrivals error:", deleteArrivalsError.message);
    return { success: false, error: deleteArrivalsError.message };
  }

  // 2. Wipe all records from tanker_arrivals
  const { error: deleteTankerError } = await supabase
    .from("tanker_arrivals")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteTankerError) {
    console.error("clearInventoryTestData delete tanker_arrivals error:", deleteTankerError.message);
    // Non-fatal: tanker_arrivals may not exist in all setups
  }

  // 3. Reset ALL fuel tanks to 0 liters (dynamic — no hardcoded IDs)
  const { error: resetError } = await supabase
    .from("fuel_tanks")
    .update({
      current_liters: 0,
      current_volume: 0,
      updated_at: new Date().toISOString(),
    })
    .neq("id", "00000000-0000-0000-0000-000000000000"); // match all rows

  if (resetError) {
    console.error("clearInventoryTestData reset tanks error:", resetError.message);
    return { success: false, error: resetError.message };
  }

  // 4. Invalidate caches for all relevant pages
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory-logs");
  revalidatePath("/admin/pump-config");
  revalidatePath("/admin/tanker-arrivals");

  return { success: true };
}


