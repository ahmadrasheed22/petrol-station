"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getPumpConfig, getShiftMeterReadings } from "@/actions/pump-actions";
import { createClient } from "@/lib/supabase/client";
import {
  db,
  type PendingExpense,
  type PendingLedgerTransaction,
  type PendingSale,
  type ShiftRecord,
} from "@/lib/offline-db";
import { startShift } from "@/lib/services/offline-service";
import { syncShiftsToCloud } from "@/actions/db-actions";

interface Machine {
  id: string;
  machine_number: string;
  fuel_type: string;
  status: string;
}

interface Meter {
  id: string;
  machine_id: string;
  meter_number: string;
  label: string;
  initial_reading: number;
  current_reading: number;
  fuel_type: string;
  status: string;
}

interface MeterReading {
  meterId: string;
  meterLabel: string;
  machineNumber: string;
  openingReading: string;
  closingReading: string;
  pricePerLiter: string;
}

interface ShiftMeterDraft {
  openingReading: string;
  closingReading: string;
  pricePerLiter?: string;
}

interface ShiftRecordWithMeterDraft extends ShiftRecord {
  meter_readings_draft?: Record<string, ShiftMeterDraft>;
  meter_readings_uploaded?: boolean;
  meter_readings_upload_recorded_at?: string;
}

interface ShiftDutyMeterReadingsProps {
  userId: string;
  workerName: string;
}

const fuelTypeOrder = ["Petrol", "Diesel", "Hi-Octane"];

const formatReading = (value: number) => value.toFixed(2);

const applyDraftIfAvailable = (
  baseReadings: Record<string, MeterReading>,
  activeShift: ShiftRecord | null | undefined
): Record<string, MeterReading> => {
  const draft = (activeShift as ShiftRecordWithMeterDraft | null)?.meter_readings_draft;
  if (!draft) return baseReadings;

  const mergedReadings = { ...baseReadings };
  Object.entries(draft).forEach(([meterId, meterDraft]) => {
    if (!mergedReadings[meterId]) return;
    mergedReadings[meterId] = {
      ...mergedReadings[meterId],
      openingReading: meterDraft.openingReading ?? mergedReadings[meterId].openingReading,
      closingReading: meterDraft.closingReading ?? mergedReadings[meterId].closingReading,
      pricePerLiter: meterDraft.pricePerLiter ?? mergedReadings[meterId].pricePerLiter,
    };
  });

  return mergedReadings;
};

export default function ShiftDutyMeterReadings({
  userId,
  workerName,
}: ShiftDutyMeterReadingsProps) {
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [readings, setReadings] = useState<Record<string, MeterReading>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingShift, setPendingShift] = useState<ShiftRecordWithMeterDraft | null>(null);
  const [endedShiftId, setEndedShiftId] = useState<number | null>(null);
  const [readingsDirty, setReadingsDirty] = useState(false);

  const liveActiveShift = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return null;
      return await db.shifts.where("status").equals("active").first();
    },
    [],
    null
  );

  const currentShift = pendingShift ?? liveActiveShift;
  const activeShift = currentShift?.id === endedShiftId ? null : currentShift;

  useEffect(() => {
    async function loadPumpConfig() {
      setLoading(true);
      try {
        const [config, recentReadings] = await Promise.all([
          getPumpConfig(),
          getShiftMeterReadings(undefined, 500),
        ]);

        const activeMachines = config.machines.filter((machine: Machine) => machine.status === "active");
        const activeMeters = config.meters.filter((meter: Meter) => meter.status === "active");
        const latestClosingByMeter: Record<string, string> = {};

        if (recentReadings.success) {
          for (const record of recentReadings.data as Array<{ meter_id: string; closing_reading: number }>) {
            if (!latestClosingByMeter[record.meter_id]) {
              latestClosingByMeter[record.meter_id] = formatReading(record.closing_reading);
            }
          }
        }

        setMachines(activeMachines);
        setMeters(activeMeters);

        const initialReadings: Record<string, MeterReading> = {};
        activeMeters.forEach((meter: Meter) => {
          const machine = activeMachines.find((item: Machine) => item.id === meter.machine_id);
          const openingReading =
            latestClosingByMeter[meter.id] ??
            formatReading(meter.current_reading ?? meter.initial_reading ?? 0);

          initialReadings[meter.id] = {
            meterId: meter.id,
            meterLabel: meter.label || meter.meter_number,
            machineNumber: machine?.machine_number || "Unknown",
            openingReading,
            closingReading: "",
            pricePerLiter: "",
          };
        });

        const localActiveShift = await db.shifts.where("status").equals("active").first();
        setReadings(applyDraftIfAvailable(initialReadings, localActiveShift));
      } catch (err) {
        console.error("Failed to load pump config:", err);
        setMessage({ type: "error", text: "Failed to load meter configuration." });
      } finally {
        setLoading(false);
      }
    }

    loadPumpConfig();
  }, []);

  const metersByFuelType = useMemo(() => {
    const grouped: Record<string, Meter[]> = {};

    meters.forEach((meter) => {
      if (!grouped[meter.fuel_type]) {
        grouped[meter.fuel_type] = [];
      }
      grouped[meter.fuel_type].push(meter);
    });

    return grouped;
  }, [meters]);

  const sortedFuelTypes = useMemo(() => {
    const ordered = fuelTypeOrder.filter((fuelType) => metersByFuelType[fuelType]);
    const remaining = Object.keys(metersByFuelType).filter((fuelType) => !fuelTypeOrder.includes(fuelType));
    return [...ordered, ...remaining];
  }, [metersByFuelType]);

  const calculateDispensed = (opening: string, closing: string): number => {
    const o = parseFloat(opening) || 0;
    const c = parseFloat(closing) || 0;
    return Math.max(0, c - o);
  };

  const calculateSaleAmount = (reading: MeterReading | undefined): number => {
    if (!reading || !reading.closingReading.trim()) return 0;
    const dispensed = (parseFloat(reading.closingReading) || 0) -
      (parseFloat(reading.openingReading) || 0);
    return dispensed * (parseFloat(reading.pricePerLiter) || 0);
  };

  const buildMeterDraft = (): Record<string, ShiftMeterDraft> => {
    const draft: Record<string, ShiftMeterDraft> = {};

    meters.forEach((meter) => {
      const reading = readings[meter.id];
      draft[meter.id] = {
        openingReading: reading?.openingReading || "",
        closingReading: reading?.closingReading || "",
        pricePerLiter: reading?.pricePerLiter || "",
      };
    });

    return draft;
  };

  const handleOpeningChange = (meterId: string, value: string) => {
    setReadingsDirty(true);
    setReadings((prev) => ({
      ...prev,
      [meterId]: {
        ...prev[meterId],
        openingReading: value,
      },
    }));
  };

  const handleClosingChange = (meterId: string, value: string) => {
    setReadingsDirty(true);
    setReadings((prev) => ({
      ...prev,
      [meterId]: {
        ...prev[meterId],
        closingReading: value,
      },
    }));
  };

  const handlePriceChange = (meterId: string, value: string) => {
    setReadingsDirty(true);
    setReadings((prev) => ({
      ...prev,
      [meterId]: {
        ...prev[meterId],
        pricePerLiter: value,
      },
    }));
  };

  const handleSaveProgress = async () => {
    if (!activeShift?.id) {
      setMessage({ type: "error", text: "Start duty before saving progress." });
      return;
    }

    if (typeof activeShift.id !== "number") {
      setMessage({ type: "error", text: "Start duty before saving progress." });
      return;
    }

    const activeShiftId = activeShift.id;

    setMessage(null);
    setIsProcessing(true);
    try {
      await db.shifts.update(activeShiftId, {
        meter_readings_draft: buildMeterDraft(),
        meter_readings_uploaded: false,
        status: "active",
        sync_status: "draft",
      } as Partial<ShiftRecordWithMeterDraft>);
      setPendingShift({
        ...activeShift,
        meter_readings_draft: buildMeterDraft(),
        meter_readings_uploaded: false,
        sync_status: "draft",
      });

      setMessage({
        type: "success",
        text: "Progress saved locally. Duty is still active.",
      });
    } catch (err) {
      console.error("Failed to save meter-reading progress:", err);
      setMessage({ type: "error", text: "Failed to save progress locally." });
    } finally {
      setIsProcessing(false);
    }
  };

  const hydrateOpeningReadings = () => {
    setReadings((prev) => {
      const nextReadings: Record<string, MeterReading> = {};

      meters.forEach((meter) => {
        const existingReading = prev[meter.id];
        nextReadings[meter.id] = {
          meterId: meter.id,
          meterLabel: meter.label || meter.meter_number,
          machineNumber:
            existingReading?.machineNumber ||
            machines.find((machine) => machine.id === meter.machine_id)?.machine_number ||
            "Unknown",
          openingReading: existingReading?.openingReading || formatReading(meter.current_reading ?? meter.initial_reading ?? 0),
          closingReading: "",
          pricePerLiter: existingReading?.pricePerLiter || "",
        };
      });

      return nextReadings;
    });
  };

  const handleStartDuty = async () => {
    setMessage(null);

    if (activeShift) {
      setMessage({ type: "error", text: "A shift is already active." });
      return;
    }

    setIsProcessing(true);
    try {
      const newShift = await startShift(userId, { worker_name: workerName, deferSync: true });
      setPendingShift(newShift);
      setEndedShiftId(null);
      setReadingsDirty(false);
      hydrateOpeningReadings();
      setMessage({
        type: "success",
        text: `Duty started at ${new Date(newShift.start_time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}. Meter inputs are now unlocked.`,
      });
    } catch (err) {
      console.error("Failed to start duty:", err);
      setMessage({ type: "error", text: "Failed to start duty. Please try again." });
    } finally {
      setIsProcessing(false);
    }
  };

  const validateReadings = (): boolean => {
    setMessage(null);

    if (!activeShift) {
      setMessage({ type: "error", text: "Start duty before entering meter readings." });
      return false;
    }

    if (meters.length === 0) {
      setMessage({ type: "error", text: "No active meters are configured." });
      return false;
    }

    const hasMissingClosing = meters.some((meter) => !readings[meter.id]?.closingReading.trim());
    if (hasMissingClosing) {
      setMessage({
        type: "error",
        text: "Enter closing readings for every active meter before ending duty.",
      });
      return false;
    }

    const hasInvalidReadings = meters.some((meter) => {
      const reading = readings[meter.id];
      const opening = parseFloat(reading.openingReading);
      const closing = parseFloat(reading.closingReading);
      return Number.isNaN(opening) || Number.isNaN(closing) || closing < opening;
    });

    if (hasInvalidReadings) {
      setMessage({
        type: "error",
        text: "Each closing reading must be greater than or equal to its opening reading.",
      });
      return false;
    }

    const hasInvalidPrice = meters.some((meter) => {
      const price = parseFloat(readings[meter.id]?.pricePerLiter ?? "");
      return Number.isNaN(price) || price <= 0;
    });

    if (hasInvalidPrice) {
      setMessage({ type: "error", text: "Enter a price per liter greater than Rs. 0 for every nozzle." });
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!validateReadings() || !activeShift || typeof activeShift.id !== "number") return;

    const activeShiftId = activeShift.id;

    setIsProcessing(true);
    try {
      const supabase = createClient();
      const shiftWithDraft = activeShift as ShiftRecordWithMeterDraft;
      const recordedAt = shiftWithDraft.meter_readings_upload_recorded_at ?? new Date().toISOString();
      await db.shifts.update(activeShiftId, {
        meter_readings_upload_recorded_at: recordedAt,
        meter_readings_draft: buildMeterDraft(),
      } as Partial<ShiftRecordWithMeterDraft>);
      setPendingShift({
        ...activeShift,
        meter_readings_upload_recorded_at: recordedAt,
        meter_readings_draft: buildMeterDraft(),
      });

      const shiftResult = await syncShiftsToCloud([{
        shift_id: activeShift.shift_id,
        user_id: activeShift.user_id,
        worker_name: activeShift.worker_name,
        start_time: activeShift.start_time,
        created_at: activeShift.created_at,
      }]);
      if (!shiftResult.success) throw new Error(shiftResult.error || "Failed to upload duty session.");

      const meterReadingsData = meters.map((meter) => {
        const reading = readings[meter.id];
        const litersDispensed = calculateDispensed(reading.openingReading, reading.closingReading);
        const pricePerLiter = parseFloat(reading.pricePerLiter || "0");
        const totalAmount = litersDispensed * pricePerLiter;

        return {
          meter_id: meter.id,
          worker_id: userId,
          opening_reading: parseFloat(reading.openingReading),
          closing_reading: parseFloat(reading.closingReading),
          liters_dispensed: litersDispensed,
          price_per_liter: pricePerLiter,
          total_amount: totalAmount,
          recorded_at: recordedAt,
        };
      });

      const { data: existingReadings, error: lookupError } = await supabase
        .from("shift_meter_readings")
        .select("id, meter_id")
        .eq("worker_id", userId)
        .eq("recorded_at", recordedAt);
      if (lookupError) throw new Error(lookupError.message);

      const inserts = [];
      for (const reading of meterReadingsData) {
        const existing = existingReadings?.find((record) => record.meter_id === reading.meter_id);
        if (existing) {
          const { error } = await supabase
            .from("shift_meter_readings")
            .update(reading)
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
        } else {
          inserts.push(reading);
        }
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("shift_meter_readings").insert(inserts);
        if (error) throw new Error(error.message);
      }

      await db.shifts.update(activeShiftId, {
        sync_status: "synced",
        meter_readings_uploaded: true,
      } as Partial<ShiftRecordWithMeterDraft>);
      setPendingShift((previous) => ({
        ...(previous ?? activeShift),
        sync_status: "synced",
        meter_readings_uploaded: true,
        meter_readings_upload_recorded_at: recordedAt,
        meter_readings_draft: buildMeterDraft(),
      }));
      setReadingsDirty(false);
      setMessage({ type: "success", text: `Meter readings uploaded for ${workerName}. Duty remains active.` });
    } catch (err) {
      console.error("Failed to upload meter readings:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload meter readings.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndDuty = async () => {
    if (!activeShift || typeof activeShift.id !== "number") return;

    const shiftWithDraft = activeShift as ShiftRecordWithMeterDraft;
    if (!shiftWithDraft.meter_readings_uploaded || readingsDirty) {
      setMessage({ type: "error", text: "Upload the current meter readings before ending duty." });
      return;
    }

    const activeShiftId = activeShift.id;
    const endTime = new Date().toISOString();
    let localSnapshot: {
      shifts: ShiftRecordWithMeterDraft[];
      expenses: PendingExpense[];
      ledger: PendingLedgerTransaction[];
      sales: PendingSale[];
    } | null = null;
    setIsProcessing(true);
    try {
      const [pendingExpenses, pendingLedger, pendingSales, pendingShifts] = await Promise.all([
        db.pendingExpenses.where("sync_status").anyOf(["draft", "pending", "failed"]).count(),
        db.pendingLedgerTransactions.where("sync_status").anyOf(["pending", "failed"]).count(),
        db.pendingSales.where("sync_status").anyOf(["pending", "failed"]).count(),
        db.shifts.where("sync_status").anyOf(["draft", "pending", "failed"]).count(),
      ]);
      if (pendingExpenses + pendingLedger + pendingSales + pendingShifts > 0) {
        setMessage({
          type: "error",
          text: "Upload or sync saved duty records before ending duty so the owner receives every record.",
        });
        return;
      }

      localSnapshot = await db.transaction(
        "r",
        db.shifts,
        db.pendingExpenses,
        db.pendingLedgerTransactions,
        db.pendingSales,
        async () => ({
          shifts: (await db.shifts.toArray()) as ShiftRecordWithMeterDraft[],
          expenses: await db.pendingExpenses.toArray(),
          ledger: await db.pendingLedgerTransactions.toArray(),
          sales: await db.pendingSales.toArray(),
        })
      );
      await db.transaction(
        "rw",
        db.shifts,
        db.pendingExpenses,
        db.pendingLedgerTransactions,
        db.pendingSales,
        async () => {
          await db.shifts.clear();
          await db.pendingExpenses.clear();
          await db.pendingLedgerTransactions.clear();
          await db.pendingSales.clear();
        }
      );
      setEndedShiftId(activeShiftId);
      setPendingShift(null);
      setReadingsDirty(false);

      const result = await syncShiftsToCloud([{
        shift_id: activeShift.shift_id,
        user_id: activeShift.user_id,
        worker_name: activeShift.worker_name,
        start_time: activeShift.start_time,
        end_time: endTime,
        created_at: activeShift.created_at,
      }]);
      if (!result.success) throw new Error(result.error || "Failed to close duty in the owner's database.");
      setReadings((previous) => {
        const next = { ...previous };
        meters.forEach((meter) => {
          const reading = previous[meter.id];
          next[meter.id] = {
            ...reading,
            openingReading: reading?.closingReading || reading?.openingReading || "0.00",
            closingReading: "",
          };
        });
        return next;
      });
      setMessage({ type: "success", text: "Duty ended. Local duty records and recent entries were cleared." });
    } catch (err) {
      console.error("Failed to end duty:", err);
      if (localSnapshot) {
        const snapshotToRestore = localSnapshot;
        try {
          await db.transaction(
            "rw",
            db.shifts,
            db.pendingExpenses,
            db.pendingLedgerTransactions,
            db.pendingSales,
            async () => {
              await db.shifts.bulkPut(snapshotToRestore.shifts);
              await db.pendingExpenses.bulkPut(snapshotToRestore.expenses);
              await db.pendingLedgerTransactions.bulkPut(snapshotToRestore.ledger);
              await db.pendingSales.bulkPut(snapshotToRestore.sales);
            }
          );
          setEndedShiftId(null);
          setPendingShift(snapshotToRestore.shifts.find((shift) => shift.id === activeShiftId) ?? null);
        } catch (restoreError) {
          console.error("Failed to restore local duty records:", restoreError);
        }
      }
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to end duty." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!loading && Object.keys(metersByFuelType).length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <p className="text-zinc-400">No active meters configured. Please contact administrator.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Duty Meter Readings</h2>
            <p className="text-xs text-zinc-400">
              Start duty first, then record opening and closing readings for every active meter.
            </p>
          </div>
        </div>

        <div>
          {activeShift ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Duty Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              Duty Locked
            </span>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-3 text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-2 text-sm font-bold cursor-pointer hover:opacity-75"
          >
            &times;
          </button>
        </div>
      )}

      {!activeShift ? (
        <div className="space-y-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white">You must start a shift to enter meter readings.</h3>
            <p className="text-sm text-zinc-400">
              {loading
                ? "Loading meter setup..."
                : "Meter inputs stay locked until duty is officially started and the worker session time is recorded."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartDuty}
            disabled={isProcessing || loading}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? "Starting Duty..." : loading ? "Loading Meter Setup..." : "Start Duty"}
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">Active Duty Session</p>
                <h3 className="text-lg font-semibold text-white">{workerName}</h3>
                <p className="text-xs text-zinc-400">
                  Started {new Date(activeShift.start_time).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-xs text-zinc-400">
                <div>
                  <span className="text-zinc-500">Shift ID:</span> <span className="font-mono text-zinc-200">{activeShift.shift_id}</span>
                </div>
                <div className="mt-1">
                  <span className="text-zinc-500">Unlock State:</span> <span className="text-emerald-400 font-semibold">Meter entry enabled</span>
                </div>
              </div>
            </div>
          </div>

          {sortedFuelTypes.map((fuelType) => (
            <section key={fuelType} className="space-y-4">
              <div
                className={`rounded-lg border px-4 py-3 ${
                  fuelType === "Petrol"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : fuelType === "Diesel"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-cyan-500/30 bg-cyan-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-semibold text-sm ${
                      fuelType === "Petrol"
                        ? "text-amber-400"
                        : fuelType === "Diesel"
                        ? "text-red-400"
                        : "text-cyan-400"
                    }`}
                  >
                    {fuelType}
                  </h3>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                    {metersByFuelType[fuelType].length} meter(s)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 ml-2 lg:grid-cols-2">
                {metersByFuelType[fuelType].map((meter) => {
                  const reading = readings[meter.id];
                  const opening = reading?.openingReading || "0.00";
                  const closing = reading?.closingReading || "";
                  const dispensed = calculateDispensed(opening, closing);

                  return (
                    <div key={meter.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-zinc-400 uppercase tracking-[0.18em]">Meter</p>
                          <p className="text-base font-semibold text-white">
                            {reading?.meterLabel} <span className="text-zinc-500">({reading?.machineNumber})</span>
                          </p>
                        </div>
                        <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                          {meter.fuel_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                            Opening Reading
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={reading?.openingReading || ""}
                            onChange={(e) => handleOpeningChange(meter.id, e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          />
                          <p className="mt-1 text-[11px] text-zinc-500">Auto-filled from last closing reading, but editable if physical meter differs.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                            Closing Reading
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={reading?.closingReading || ""}
                            onChange={(e) => handleClosingChange(meter.id, e.target.value)}
                            placeholder="e.g., 1450.75"
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                            Price per Liter (Rs)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={reading?.pricePerLiter || ""}
                            onChange={(event) => handlePriceChange(meter.id, event.target.value)}
                            placeholder="e.g., 275.00"
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 px-3 py-2">
                          <p className="mb-1 text-xs text-zinc-400">Liters Dispensed</p>
                          <p className={`text-lg font-bold ${dispensed > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                            {dispensed.toFixed(2)} L
                          </p>
                        </div>
                        <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 px-3 py-2">
                          <p className="mb-1 text-xs text-zinc-400">Nozzle Sale</p>
                          <p className="text-lg font-bold text-emerald-300">
                            Rs. {calculateSaleAmount(reading).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="grid grid-cols-1 gap-3 border-t border-zinc-800/50 pt-4 sm:grid-cols-3">
            {sortedFuelTypes.map((fuelType) => {
              const total = metersByFuelType[fuelType].reduce(
                (sum, meter) => sum + calculateSaleAmount(readings[meter.id]),
                0
              );
              return (
                <div key={fuelType} className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                  <p className="text-xs text-zinc-400">Total {fuelType} Sale</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    Rs. {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleSaveProgress}
              disabled={isProcessing}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 hover:bg-zinc-900 disabled:bg-zinc-800 disabled:cursor-not-allowed px-4 py-3 font-medium text-zinc-100 text-sm transition-colors"
            >
              {isProcessing ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isProcessing}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
            >
              {isProcessing ? "Uploading..." : "Upload"}
            </button>
            <button
              type="button"
              onClick={handleEndDuty}
              disabled={isProcessing}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
            >
              {isProcessing ? "Processing..." : "End Duty"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
