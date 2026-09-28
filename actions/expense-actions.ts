"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { createClient } from "@/lib/supabase/server";

export async function deleteExpenses(
  ids: string[]
): Promise<{ success: false; error: string } | { success: true; deletedIds: string[] }> {
  const auth = await getAuthenticatedUserProfile();
  if (!auth || auth.profile.role !== "owner") {
    return { success: false, error: "Unauthorized. Only station owners can delete expenses." };
  }

  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 1000 ||
    ids.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  ) {
    return { success: false, error: "Select valid expenses to delete." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .in("id", [...new Set(ids)])
    .select("id");

  if (error) return { success: false, error: error.message };

  const deletedIds = (data || []).map((expense) => expense.id);
  if (deletedIds.length === 0) {
    return { success: false, error: "No matching expenses were deleted." };
  }

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  return { success: true, deletedIds };
}