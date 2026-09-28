"use client";

import { useEffect, useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, PendingExpense, PendingLedgerTransaction, ShiftRecord } from "@/lib/offline-db";
import { syncExpensesToCloud, syncShiftsToCloud } from "@/actions/db-actions";
import { getShiftMeterReadings } from "@/actions/pump-actions";
import RecentEntriesView, {
  type EntryType,
  type UnifiedEntry,
} from "@/components/RecentEntriesView";

interface ShiftMeterDraft {
  openingReading: string;
  closingReading: string;
  pricePerLiter?: string;
  meterLabel?: string;
  fuelType?: string;
}

interface ActiveShiftWithMeterDraft extends ShiftRecord {
  id: number;
  meter_readings_draft?: Record<string, ShiftMeterDraft>;
  meter_readings_uploaded?: boolean;
  meter_readings_upload_recorded_at?: string;
}

interface UploadedMeterReading {
  id: string;
  meter_id: string;
  opening_reading: number;
  closing_reading: number;
  liters_dispensed: number;
  price_per_liter: number;
  total_amount: number;
  recorded_at: string;
  machine_meters: { label: string; meter_number: string; fuel_type: string };
}

export default function RecentEntries({
  initialFilter = "sale",
  showFilterTabs = true,
  userId,
}: {
  initialFilter?: "expense" | "sale";
  showFilterTabs?: boolean;
  userId?: string;
}) {
  const [filter, setFilter] = useState<EntryType>(initialFilter);
  const [uploadingExpenseIds, setUploadingExpenseIds] = useState<Set<number>>(new Set());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedMeterReadings, setUploadedMeterReadings] = useState<{
    shiftId: number;
    recordedAt: string;
    readings: UploadedMeterReading[];
  } | null>(null);

  const activeShift = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return null;
      return (await db.shifts.where("status").equals("active").first()) as ActiveShiftWithMeterDraft | undefined ?? null;
    },
    [],
    null
  );

  const uploadRecordedAt = activeShift?.meter_readings_upload_recorded_at;
  const activeShiftId = activeShift?.id;
  const meterReadingsUploaded = activeShift?.meter_readings_uploaded ?? false;

  useEffect(() => {
    if (!activeShiftId || !uploadRecordedAt || !userId) return;

    let cancelled = false;
    void getShiftMeterReadings(userId, 500, 0, uploadRecordedAt).then((result) => {
      if (!cancelled && result.success) {
        setUploadedMeterReadings({
          shiftId: activeShiftId,
          recordedAt: uploadRecordedAt,
          readings: result.data as UploadedMeterReading[],
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeShiftId, uploadRecordedAt, meterReadingsUploaded, userId]);

  // Reactive Dexie queries
  const expenses = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.pendingExpenses.toArray();
    },
    [],
    []
  );

  const ledgerTxs = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return [];
      return await db.pendingLedgerTransactions.toArray();
    },
    [],
    []
  );

  // Filter for today's entries and unify into a sorted list
  const todayEntries = useMemo(() => {
    const todayStr = new Date().toDateString();
    const list: UnifiedEntry[] = [];
    const currentShiftReadings =
      uploadedMeterReadings &&
      uploadedMeterReadings.shiftId === activeShift?.id &&
      uploadedMeterReadings.recordedAt === uploadRecordedAt
        ? uploadedMeterReadings.readings
        : [];

    // Map expenses
    (expenses || []).forEach((exp: PendingExpense) => {
      if (!exp.id) return;
      const isToday = new Date(exp.created_at).toDateString() === todayStr;
      const belongsToActiveShift = exp.shift_id === activeShift?.shift_id;
      if (belongsToActiveShift || (!activeShift && isToday)) {
        list.push({
          uid: `exp-${exp.id}`,
          originalId: exp.id,
          type: "expense",
          title: exp.category,
          subtitle: exp.description || "Station Expense",
          amount: exp.amount,
          category: exp.category,
          description: exp.description,
          syncStatus: exp.sync_status,
          createdAt: exp.created_at,
        });
      }
    });

    // Map credit sales (ledger)
    (ledgerTxs || []).forEach((tx: PendingLedgerTransaction) => {
      if (!tx.id) return;
      if (tx.transaction_type !== "credit") return;
      const isToday = new Date(tx.created_at).toDateString() === todayStr;
      if (isToday) {
        const rate = tx.price_per_liter || tx.applied_sp || 0;
        const liters = tx.liters || 0;
        list.push({
          uid: `ledger-${tx.id}`,
          originalId: tx.id,
          type: "sale",
          title: tx.customer_name || "Fuel Sale",
          subtitle: liters > 0 ? `${liters} Liters @ Rs. ${rate}/L` : "Fuel Sale",
          amount: tx.amount,
          liters,
          pricePerLiter: rate,
          customerName: tx.customer_name,
          syncStatus: tx.sync_status,
          createdAt: tx.created_at,
        });
      }
    });

    const draft = activeShift?.meter_readings_draft;
    if (currentShiftReadings.length > 0) {
      currentShiftReadings.forEach((reading) => {
        list.push({
          uid: `meter-${reading.id}`,
          originalId: -1,
          type: "sale",
          title: reading.machine_meters.label || reading.machine_meters.meter_number,
          subtitle: `${reading.machine_meters.fuel_type} · ${reading.liters_dispensed.toFixed(2)} L @ Rs. ${reading.price_per_liter}/L`,
          amount: reading.total_amount,
          liters: reading.liters_dispensed,
          pricePerLiter: reading.price_per_liter,
          syncStatus: "synced",
          createdAt: reading.recorded_at,
        });
      });
    } else if (draft) {
      Object.entries(draft).forEach(([meterId, reading]) => {
        if (!reading.closingReading.trim()) return;
        const opening = Number.parseFloat(reading.openingReading) || 0;
        const closing = Number.parseFloat(reading.closingReading) || 0;
        const liters = Math.max(0, closing - opening);
        const pricePerLiter = Number.parseFloat(reading.pricePerLiter || "0");
        list.push({
          uid: `meter-draft-${activeShift.id}-${meterId}`,
          originalId: -1,
          type: "sale",
          title: reading.meterLabel || `Meter ${meterId.slice(0, 8)}`,
          subtitle: `${reading.fuelType ? `${reading.fuelType} · ` : ""}${liters.toFixed(2)} L @ Rs. ${pricePerLiter}/L`,
          amount: liters * pricePerLiter,
          liters,
          pricePerLiter,
          syncStatus: "draft",
          createdAt: activeShift.start_time,
        });
      });
    }

    // Sort newest first
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [expenses, ledgerTxs, activeShift, uploadedMeterReadings, uploadRecordedAt]);

  // Filtered by selected tab
  const displayedEntries = useMemo(() => {
    return todayEntries.filter((e) => e.type === filter);
  }, [todayEntries, filter]);

  const handleExpenseUpload = async (expenseId: number) => {
    const expense = await db.pendingExpenses.get(expenseId);
    if (!expense) return;

    setUploadError(null);
    setUploadingExpenseIds((ids) => new Set(ids).add(expenseId));

    try {
      if (expense.shift_id) {
        const shift = await db.shifts.where("shift_id").equals(expense.shift_id).first();
        if (shift) {
          const shiftResult = await syncShiftsToCloud([{
            shift_id: shift.shift_id,
            user_id: shift.user_id,
            worker_name: shift.worker_name,
            start_time: shift.start_time,
            created_at: shift.created_at,
          }]);
          if (!shiftResult.success) throw new Error(shiftResult.error || "Failed to upload duty session.");
        }
      }

      const result = await syncExpensesToCloud([{
        shift_id: expense.shift_id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        created_at: expense.created_at,
      }]);
      if (!result.success) throw new Error(result.error || "Expense upload failed.");
      await db.pendingExpenses.update(expenseId, { sync_status: "synced" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload expense.");
    } finally {
      setUploadingExpenseIds((ids) => {
        const remaining = new Set(ids);
        remaining.delete(expenseId);
        return remaining;
      });
    }
  };

  const expenseEntries = todayEntries.filter((e) => e.type === "expense");
  const saleEntries = todayEntries.filter((e) => e.type === "sale");

  const expenseTotal = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const fuelSalesTotalAmount = saleEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const fuelSalesTotalLiters = saleEntries.reduce((sum, entry) => sum + (entry.liters || 0), 0);
  const activeSummary =
    filter === "sale"
      ? {
          label: "Total Fuel Sold",
          value: `${fuelSalesTotalLiters.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} L`,
          helper: `Fuel Sales: Rs. ${fuelSalesTotalAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        }
      : {
          label: "Total Expenses",
          value: `Rs. ${expenseTotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          helper: `${expenseEntries.length} expense${expenseEntries.length === 1 ? "" : "s"} recorded today`,
        };

  return (
    <RecentEntriesView
      filter={filter}
      showFilterTabs={showFilterTabs}
      saleCount={saleEntries.length}
      expenseCount={expenseEntries.length}
      displayedEntries={displayedEntries}
      summary={activeSummary}
      uploadingExpenseIds={uploadingExpenseIds}
      uploadError={uploadError}
      onFilterChange={setFilter}
      onExpenseUpload={(expenseId) => void handleExpenseUpload(expenseId)}
    />
  );
}
