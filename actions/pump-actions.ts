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
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}

export async function updateFuelTank(id: string, data: Partial<{ tank_number: string; fuel_type: string; capacity_liters: number; current_liters: number }>) {
  const supabase = await createClient();
  const { error } = await supabase.from("fuel_tanks").update(data).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}

export async function deleteFuelTank(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fuel_tanks").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}

export async function addPumpMachine(data: { machine_number: string; fuel_type: string; tank_id: string | null; status: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("pump_machines").insert(data);
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}

export async function updatePumpMachine(id: string, data: Partial<{ machine_number: string; fuel_type: string; tank_id: string | null; status: string }>) {
  const supabase = await createClient();
  const { error } = await supabase.from("pump_machines").update(data).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}

export async function deletePumpMachine(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pump_machines").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}

export async function addMachineMeter(data: { machine_id: string; meter_number: string; label: string; initial_reading: number; current_reading: number; fuel_type: string; status: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("machine_meters").insert(data);
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}

export async function updateMachineMeter(id: string, data: Partial<{ machine_id: string; meter_number: string; label: string; initial_reading: number; current_reading: number; fuel_type: string; status: string }>) {
  const supabase = await createClient();
  const { error } = await supabase.from("machine_meters").update(data).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}

export async function deleteMachineMeter(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("machine_meters").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/pump-config");
}
