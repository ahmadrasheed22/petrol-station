"use client";

import { useEffect, useState, useMemo } from "react";
import { getPumpConfig } from "@/actions/pump-actions";
import { createClient } from "@/lib/supabase/client";

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
}

interface ShiftDutyMeterReadingsProps {
  userId: string;
  workerName: string;
}

export default function ShiftDutyMeterReadings({
  userId,
  workerName,
}: ShiftDutyMeterReadingsProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [readings, setReadings] = useState<Record<string, MeterReading>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch pump configuration
  useEffect(() => {
    if (!mounted) return;

    async function loadPumpConfig() {
      setLoading(true);
      try {
        const config = await getPumpConfig();
        
        // Filter active machines and meters
        const activeMachines = config.machines.filter((m: Machine) => m.status === "active");
        const activeMeters = config.meters.filter((m: Meter) => m.status === "active");

        setMachines(activeMachines);
        setMeters(activeMeters);

        // Initialize readings object with empty strings
        const initialReadings: Record<string, MeterReading> = {};
        activeMeters.forEach((meter: Meter) => {
          const machine = activeMachines.find((m: Machine) => m.id === meter.machine_id);
          initialReadings[meter.id] = {
            meterId: meter.id,
            meterLabel: meter.label || meter.meter_number,
            machineNumber: machine?.machine_number || "Unknown",
            openingReading: "",
            closingReading: "",
          };
        });
        setReadings(initialReadings);
      } catch (err) {
        console.error("Failed to load pump config:", err);
        setMessage({ type: "error", text: "Failed to load meter configuration." });
      } finally {
        setLoading(false);
      }
    }

    loadPumpConfig();
  }, [mounted]);

  // Group meters by fuel type
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

  // Handle opening reading change
  const handleOpeningChange = (meterId: string, value: string) => {
    setReadings((prev) => ({
      ...prev,
      [meterId]: {
        ...prev[meterId],
        openingReading: value,
      },
    }));
  };

  // Handle closing reading change
  const handleClosingChange = (meterId: string, value: string) => {
    setReadings((prev) => ({
      ...prev,
      [meterId]: {
        ...prev[meterId],
        closingReading: value,
      },
    }));
  };

  // Calculate liters dispensed
  const calculateDispensed = (opening: string, closing: string): number => {
    const o = parseFloat(opening) || 0;
    const c = parseFloat(closing) || 0;
    return Math.max(0, c - o);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation: at least one meter must have readings
    const hasValidReadings = Object.values(readings).some(
      (r) => r.openingReading.trim() && r.closingReading.trim()
    );

    if (!hasValidReadings) {
      setMessage({
        type: "error",
        text: "Please enter at least one meter reading (opening and closing).",
      });
      return;
    }

    // Validation: closing must be >= opening for all entries
    const hasInvalidReadings = Object.values(readings).some((r) => {
      if (!r.openingReading.trim() || !r.closingReading.trim()) return false;
      const opening = parseFloat(r.openingReading);
      const closing = parseFloat(r.closingReading);
      return closing < opening;
    });

    if (hasInvalidReadings) {
      setMessage({
        type: "error",
        text: "Closing meter reading cannot be less than opening reading.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // Prepare shift record with all meter readings
      const meterReadingsData = Object.values(readings)
        .filter((r) => r.openingReading.trim() && r.closingReading.trim())
        .map((r) => ({
          meter_id: r.meterId,
          worker_id: userId,
          opening_reading: parseFloat(r.openingReading),
          closing_reading: parseFloat(r.closingReading),
          liters_dispensed: calculateDispensed(r.openingReading, r.closingReading),
          recorded_at: new Date().toISOString(),
        }));

      // Insert into shift_meter_readings table
      const { error } = await supabase
        .from("shift_meter_readings")
        .insert(meterReadingsData);

      if (error) {
        throw new Error(error.message);
      }

      // Reset form
      const resetReadings: Record<string, MeterReading> = {};
      meters.forEach((meter) => {
        const machine = machines.find((m) => m.id === meter.machine_id);
        resetReadings[meter.id] = {
          meterId: meter.id,
          meterLabel: meter.label || meter.meter_number,
          machineNumber: machine?.machine_number || "Unknown",
          openingReading: "",
          closingReading: "",
        };
      });
      setReadings(resetReadings);

      setMessage({
        type: "success",
        text: `Meter readings recorded successfully for ${meterReadingsData.length} meter(s)!`,
      });
    } catch (err) {
      console.error("Failed to save meter readings:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save meter readings.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl animate-pulse space-y-4">
        <div className="h-6 w-48 bg-zinc-800 rounded" />
        <div className="h-32 bg-zinc-800/40 rounded-xl" />
        <div className="h-10 bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <p className="text-zinc-400">Loading meter configuration...</p>
      </div>
    );
  }

  if (Object.keys(metersByFuelType).length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <p className="text-zinc-400">No active meters configured. Please contact administrator.</p>
      </div>
    );
  }

  const fuelTypeOrder = ["Petrol", "Diesel", "Hi-Octane"];
  const sortedFuelTypes = fuelTypeOrder.filter((ft) => metersByFuelType[ft]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
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
            <h2 className="text-lg font-bold text-white tracking-tight">Meter Readings</h2>
            <p className="text-xs text-zinc-400">Record opening & closing readings for each nozzle</p>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-6 rounded-xl border p-3 text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-sm font-bold ml-2 cursor-pointer hover:opacity-75"
          >
            &times;
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Fuel Type Sections */}
        {sortedFuelTypes.map((fuelType) => (
          <div key={fuelType} className="space-y-4">
            {/* Fuel Type Header Card */}
            <div
              className={`rounded-lg border px-4 py-3 ${
                fuelType === "Petrol"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : fuelType === "Diesel"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-cyan-500/30 bg-cyan-500/5"
              }`}
            >
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
            </div>

            {/* Meters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2">
              {metersByFuelType[fuelType].map((meter) => {
                const reading = readings[meter.id];
                const opening = parseFloat(reading?.openingReading || "0") || 0;
                const closing = parseFloat(reading?.closingReading || "0") || 0;
                const dispensed = calculateDispensed(
                  reading?.openingReading || "0",
                  reading?.closingReading || "0"
                );

                return (
                  <div
                    key={meter.id}
                    className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4 space-y-3"
                  >
                    {/* Meter Label */}
                    <div>
                      <p className="text-xs text-zinc-400 font-medium">
                        {reading.meterLabel} ({reading.machineNumber})
                      </p>
                    </div>

                    {/* Opening Reading */}
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
                        placeholder="e.g., 1234.50"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                      />
                    </div>

                    {/* Closing Reading */}
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

                    {/* Auto-calculated Dispensed Amount */}
                    <div className="rounded-lg bg-zinc-900 px-3 py-2 border border-zinc-700/50">
                      <p className="text-xs text-zinc-400 mb-1">Liters Dispensed</p>
                      <p
                        className={`text-lg font-bold ${
                          dispensed > 0 ? "text-emerald-400" : "text-zinc-500"
                        }`}
                      >
                        {dispensed.toFixed(2)} L
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4 border-t border-zinc-800/50">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2.5 font-medium text-white text-sm transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save All Readings"}
          </button>
        </div>
      </form>
    </div>
  );
}
