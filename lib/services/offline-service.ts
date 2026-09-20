import { db } from "@/lib/offline-db";

/**
 * Service functions for offline IndexedDB operations (Dexie.js).
 * Keeps database interaction separate from UI components.
 */

export function fetchPendingSales() {
  return db.pendingSales.toArray();
}

export async function addDummySale() {
  return await db.pendingSales.add({
    shift_id: "shift_test",
    product_id: "Petrol",
    opening_meter: 1000,
    closing_meter: 1010,
    total_liters: 10,
    applied_sp: 270,
    applied_cp: 260,
    sync_status: "pending",
    created_at: new Date().toISOString(),
  });
}

export async function clearPendingSales() {
  return await db.pendingSales.clear();
}
