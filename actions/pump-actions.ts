"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { revalidatePath } from "next/cache";

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

export async function addFuelTank(data: { tank_number: string; fuel_type: string; capacity_liters: number; current_liters: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("fuel_tanks").insert(data);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pump-config");
  return { success: true };
}

export async function updateFuelTank(id: string, data: Partial<{ tank_number: string; fuel_type: string; capacity_liters: number; current_liters: number }>) {
  const supabase = await createClient();
  const { error } = await supabase.from("fuel_tanks").update(data).eq("id", id);
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

export async function addPumpMachine(data: { machine_number: string; fuel_type: string; tank_id: string | null; status: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("pump_machines").insert(data);
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

export async function addMachineMeter(data: { machine_id: string; meter_number: string; label: string; initial_reading: number; current_reading: number; fuel_type: string; status: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("machine_meters").insert(data);
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
  offset: number = 0
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
      recorded_at,
      created_at,
      machine_meters!inner(meter_number, label, fuel_type),
      profiles!inner(name)
    `)
    .order("recorded_at", { ascending: false });

  if (workerId) {
    query = query.eq("worker_id", workerId);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
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

