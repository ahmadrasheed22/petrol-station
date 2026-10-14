"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { revalidatePath } from "next/cache";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function findFuelProductId(
  supabase: SupabaseClient,
  fuelType: string
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("name", fuelType.trim())
    .limit(2);

  if (error) {
    return { error: `Could not look up the ${fuelType} fuel product: ${error.message}` };
  }
  if (!data || data.length !== 1) {
    return {
      error: data?.length
        ? `Multiple products match "${fuelType}". Keep exactly one product for this fuel type.`
        : `No product matches "${fuelType}". Add the fuel product before configuring its tank.`,
    };
  }

  return { id: data[0].id };
}

export async function getPumpConfig() {
  const supabase = await createClient();

  const [tanksRes, machinesRes, metersRes] = await Promise.all([
    supabase.from("fuel_tanks").select("*").order("created_at", { ascending: true }),
    supabase.from("pump_machines").select("*").order("created_at", { ascending: true }),
    supabase.from("machine_meters").select("*").order("created_at", { ascending: true }),
  ]);

  return {
    tanks: tanksRes.data || [],
    machines: machinesRes.data || [],
    meters: metersRes.data || [],
  };
}

export async function addFuelTank(data: { fuel_type: string; capacity_liters: number; current_liters: number }) {
  const supabase = await createClient();

  const [{ count, error: countError }, product] = await Promise.all([
    supabase.from("fuel_tanks").select("id", { count: "exact", head: true }),
    findFuelProductId(supabase, data.fuel_type),
  ]);
  if (countError) return { success: false, error: `Could not count existing tanks: ${countError.message}` };
  if (count === null) return { success: false, error: "Could not determine the next tank number." };
  if ("error" in product) return { success: false, error: product.error };

  const tankNumber = `Tank ${count + 1} - ${data.fuel_type.trim()}`;
  const { data: existing, error: duplicateCheckError } = await supabase
    .from("fuel_tanks")
    .select("id, tank_number")
    .ilike("tank_number", tankNumber)
    .limit(1);

  if (duplicateCheckError) {
    return { success: false, error: `Could not validate the generated tank name: ${duplicateCheckError.message}` };
  }
  if (existing && existing.length > 0) {
    return { success: false, error: `The generated tank name "${existing[0].tank_number}" already exists. Resolve the duplicate before adding a tank.` };
  }

  const { error } = await supabase.from("fuel_tanks").insert({
    tank_number: tankNumber,
    fuel_type: data.fuel_type.trim(),
    capacity_liters: data.capacity_liters,
    current_liters: data.current_liters,
    current_volume: data.current_liters,
    product_id: product.id,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function updateFuelTank(id: string, data: Partial<{ tank_number: string; fuel_type: string; capacity_liters: number; current_liters: number }>) {
  const supabase = await createClient();

  // If renaming, check for duplicate names (excluding the current record)
  if (data.tank_number) {
    const trimmedName = data.tank_number.trim();
    const { data: existing } = await supabase
      .from("fuel_tanks")
      .select("id, tank_number")
      .ilike("tank_number", trimmedName)
      .neq("id", id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: `A tank named "${existing[0].tank_number}" already exists.` };
    }
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.fuel_type) {
    const product = await findFuelProductId(supabase, data.fuel_type);
    if ("error" in product) return { success: false, error: product.error };
    updateData.product_id = product.id;
  }
  if (data.current_liters !== undefined) {
    updateData.current_volume = data.current_liters;
  }

  const { error } = await supabase.from("fuel_tanks").update(updateData).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function deleteFuelTank(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fuel_tanks").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function addPumpMachine(data: { fuel_type: string; tank_id: string | null; status: string }) {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("pump_machines")
    .select("id", { count: "exact", head: true });
  if (countError) return { success: false, error: `Could not count existing dispensers: ${countError.message}` };
  if (count === null) return { success: false, error: "Could not determine the next dispenser number." };

  const { error } = await supabase.from("pump_machines").insert({
    machine_number: `Dispenser ${count + 1}`,
    fuel_type: data.fuel_type.trim(),
    tank_id: data.tank_id,
    status: data.status,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function updatePumpMachine(id: string, data: Partial<{ machine_number: string; fuel_type: string; tank_id: string | null; status: string }>) {
  const supabase = await createClient();
  const { error } = await supabase.from("pump_machines").update(data).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function deletePumpMachine(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pump_machines").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function addMachineMeter(data: { machine_id: string; initial_reading: number; current_reading: number; fuel_type: string; status: string }) {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("machine_meters")
    .select("id", { count: "exact", head: true });
  if (countError) return { success: false, error: `Could not count existing meters: ${countError.message}` };
  if (count === null) return { success: false, error: "Could not determine the next meter number." };

  const meterName = `Meter ${count + 1}`;
  const { error } = await supabase.from("machine_meters").insert({
    ...data,
    meter_number: meterName,
    label: meterName,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function updateMachineMeter(id: string, data: Partial<{ machine_id: string; meter_number: string; label: string; initial_reading: number; current_reading: number; fuel_type: string; status: string }>) {
  const supabase = await createClient();
  const { error } = await supabase.from("machine_meters").update(data).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function deleteMachineMeter(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("machine_meters").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

/**
 * Fetch shift meter readings with joined meter and worker data
 */
export async function getShiftMeterReadings(
  workerId?: string,
  limit: number = 100,
  offset: number = 0,
  recordedAt?: string
) {
  const supabase = await createClient();

  let query = supabase
    .from("shift_meter_readings")
    .select(`
      id,
      meter_id,
      worker_id,
      opening_reading,
      closing_reading,
      liters_dispensed,
      price_per_liter,
      total_amount,
      recorded_at,
      created_at,
      machine_meters!inner(meter_number, label, fuel_type),
      profiles!inner(name)
    `)
    .order("recorded_at", { ascending: false });

  if (workerId) {
    query = query.eq("worker_id", workerId);
  }
  if (recordedAt) {
    query = query.eq("recorded_at", recordedAt);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function deleteMeterReadings(
  ids: string[]
): Promise<{ success: false; error: string } | { success: true; deletedIds: string[] }> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth || auth.profile.role !== "owner") {
    return { success: false, error: "Unauthorized. Only station owners can delete meter readings." };
  }

  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 1000 ||
    ids.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  ) {
    return { success: false, error: "Select valid meter readings to delete." };
  }

  const uniqueIds = [...new Set(ids)];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_meter_readings")
    .delete()
    .in("id", uniqueIds)
    .select("id");

  if (error) return { success: false, error: error.message };

  const deletedIds = (data || []).map((reading) => reading.id);
  if (deletedIds.length === 0) {
    return { success: false, error: "No matching meter readings were deleted." };
  }

  revalidatePath("/admin/meter-readings");
  revalidatePath("/admin");
  return { success: true, deletedIds };
}

/**
 * Fetch meter readings for a specific date range
 */
export async function getMeterReadingsByDateRange(
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shift_meter_readings")
    .select(`
      id,
      meter_id,
      worker_id,
      opening_reading,
      closing_reading,
      liters_dispensed,
      price_per_liter,
      total_amount,
      recorded_at,
      machine_meters!inner(meter_number, label, fuel_type),
      profiles!inner(name)
    `)
    .gte("recorded_at", startDate)
    .lte("recorded_at", endDate)
    .order("recorded_at", { ascending: false });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

/**
 * Fetch summary stats for meter readings
 */
export async function getMeterReadingStats(workerId?: string) {
  const supabase = await createClient();

  let query = supabase.from("shift_meter_readings").select("liters_dispensed");

  if (workerId) {
    query = query.eq("worker_id", workerId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { success: false, error: error?.message, totalLiters: 0, recordCount: 0 };
  }

  const totalLiters = data.reduce((sum, record) => sum + (record.liters_dispensed || 0), 0);

  return {
    success: true,
    totalLiters: parseFloat(totalLiters.toFixed(2)),
    recordCount: data.length,
  };
}
