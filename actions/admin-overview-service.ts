import { createClient } from "@/lib/supabase/server";
import type { OverviewStats } from "@/actions/admin-actions";

export async function getAdminOverviewDataService(): Promise<OverviewStats> {
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

    const { count: workersCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker");

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

    const formattedShifts = (shifts || []).map((shift) => {
      const profile = shift.profiles as unknown as { name?: string | null } | null;
      return {
        id: shift.id,
        worker_id: shift.worker_id,
        worker_name: profile?.name || `Worker (${shift.worker_id?.slice(0, 6) || "Unknown"})`,
        product_name: shift.product_name || "Fuel",
        start_time: shift.start_time,
        end_time: shift.end_time as string | undefined,
        opening_meter: Number(shift.opening_meter || 0),
        closing_meter: Number(shift.closing_meter || 0),
        testing_liters: Number(shift.testing_liters || 0),
        total_liters: Number(shift.total_liters || 0),
        price_per_liter: Number(shift.price_per_liter || 0),
        expected_cash: Number(shift.expected_cash || 0),
        actual_cash: Number(shift.actual_cash || 0),
        shortage_amount: Number(shift.shortage_amount || 0),
      };
    });

    const today = new Date().toISOString().slice(0, 10);
    const todayShifts = formattedShifts.filter((shift) => shift.start_time.startsWith(today));
    const sampleSet = todayShifts.length > 0 ? todayShifts : formattedShifts.slice(0, 10);

    const todayLiters = sampleSet.reduce((total, shift) => total + shift.total_liters, 0);
    const todayExpectedCash = sampleSet.reduce((total, shift) => total + shift.expected_cash, 0);
    const todayActualCash = sampleSet.reduce((total, shift) => total + shift.actual_cash, 0);
    const todayShortageAmount = sampleSet.reduce((total, shift) => total + shift.shortage_amount, 0);

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