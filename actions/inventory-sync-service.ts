import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { InventoryPayload, SyncResult } from "@/actions/db-actions";

export async function syncInventoryToCloudService(
  entries: InventoryPayload[]
): Promise<SyncResult> {
  if (!entries || entries.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const supabase = await createClient();
    const productIds = Array.from(
      new Set(
        entries
          .map((entry) => entry.product_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (productIds.length > 0) {
      const { data: existingProducts } = await supabase
        .from("products")
        .select("id")
        .in("id", productIds);

      const existingIdSet = new Set((existingProducts || []).map((product) => product.id));
      const missingIds = productIds.filter((id) => !existingIdSet.has(id));

      if (missingIds.length > 0) {
        const fallbackMap: Record<
          string,
          { name: string; current_sp: number; current_cp: number }
        > = {
          "11111111-1111-4111-8111-111111111111": {
            name: "Petrol",
            current_sp: 270,
            current_cp: 255,
          },
          "22222222-2222-4222-8222-222222222222": {
            name: "Diesel",
            current_sp: 280,
            current_cp: 265,
          },
          "33333333-3333-4333-8333-333333333333": {
            name: "Hi-Octane",
            current_sp: 300,
            current_cp: 285,
          },
        };

        const productsToSeed = missingIds
          .filter((id) => Boolean(fallbackMap[id]))
          .map((id) => ({
            id,
            name: fallbackMap[id].name,
            current_sp: fallbackMap[id].current_sp,
            current_cp: fallbackMap[id].current_cp,
          }));

        if (productsToSeed.length > 0) {
          const { error: seedError } = await supabase
            .from("products")
            .upsert(productsToSeed, { onConflict: "id" });

          if (seedError) {
            console.warn("Warning: Could not auto-seed missing products:", seedError.message);
          }
        }
      }
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    const receivedBy = currentUser?.id ?? null;

    const formattedEntries = entries.map((entry) => ({
      product_id: entry.product_id,
      billed_liters: Number(entry.billed_liters) || 0,
      actual_received_liters: Number(entry.actual_received_liters) || 0,
      cost_per_liter: Number(entry.cost_per_liter) || 0,
      received_by: receivedBy,
      created_at: entry.created_at || new Date().toISOString(),
    }));


    const { data, error } = await supabase
      .from("inventory_arrivals")
      .insert(formattedEntries)
      .select("id");

    if (error) {
      const isMissingTable =
        error.message?.includes("Could not find the table") ||
        error.message?.includes("schema cache") ||
        error.code === "PGRST205" ||
        error.code === "42P01";

      const fullErrorMsg = isMissingTable
        ? "Supabase table 'public.inventory_arrivals' is missing. Please run migration '0002_profiles_trigger_and_seed.sql' in your Supabase Dashboard SQL Editor."
        : [error.message, error.details, error.hint].filter(Boolean).join(" | ");

      console.error("Supabase insert inventory_arrivals error:", fullErrorMsg);
      return { success: false, error: fullErrorMsg };
    }

    revalidatePath("/admin/inventory-logs");
    revalidatePath("/admin/tanker-arrivals");
    revalidatePath("/admin/pump-config");

    return {
      success: true,
      insertedCount: data ? data.length : entries.length,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to sync inventory to cloud.";
    console.error("syncInventoryToCloud exception:", err);
    return { success: false, error: errorMsg };
  }
}