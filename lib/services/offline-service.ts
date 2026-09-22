import { db, ShiftRecord, PendingSale } from "@/lib/offline-db";

/**
 * Service functions for offline IndexedDB operations (Dexie.js).
 * Keeps database interaction separate from UI components.
 */

export function fetchPendingSales(): Promise<PendingSale[]> {
  return db.pendingSales.toArray();
}

export async function getActiveShift(): Promise<ShiftRecord | undefined> {
  return await db.shifts.where("status").equals("active").first();
}

export async function startShift(userId: string): Promise<ShiftRecord> {
  const now = new Date().toISOString();
  const shiftId = `shift_${Date.now()}`;

  // Automatically mark any existing active shift as ended
  const existingActive = await db.shifts
    .where("status")
    .equals("active")
    .toArray();
  for (const shift of existingActive) {
    if (shift.id) {
      await db.shifts.update(shift.id, { status: "ended", end_time: now });
    }
  }

  const shiftData: Omit<ShiftRecord, "id"> = {
    shift_id: shiftId,
    user_id: userId,
    start_time: now,
    status: "active",
    sync_status: "pending",
    created_at: now,
  };

  const id = await db.shifts.add(shiftData as ShiftRecord);
  return { id: id as number, ...shiftData };
}

export async function endShift(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.shifts.update(id, { status: "ended", end_time: now });
}

export async function addPendingSale(saleData: {
  shift_id?: string;
  product_id: string;
  total_liters: number;
  applied_sp: number;
  applied_cp?: number;
  opening_meter?: number;
  closing_meter?: number;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = await db.pendingSales.add({
    shift_id: saleData.shift_id,
    product_id: saleData.product_id,
    opening_meter: saleData.opening_meter,
    closing_meter: saleData.closing_meter,
    total_liters: saleData.total_liters,
    applied_sp: saleData.applied_sp,
    applied_cp: saleData.applied_cp ?? saleData.applied_sp,
    sync_status: "pending",
    created_at: now,
  });
  return id as number;
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
