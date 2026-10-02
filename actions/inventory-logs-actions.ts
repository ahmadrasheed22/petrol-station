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
