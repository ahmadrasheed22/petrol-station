"use client";

import { useEffect, useMemo, useState } from "react";
import { getPumpConfig, getShiftMeterReadings } from "@/actions/pump-actions";

interface MeterReadingRecord {
  id: string;
  meter_id: string;
  worker_id: string;
  opening_reading: number;
  closing_reading: number;
  liters_dispensed: number;
  price_per_liter: number;
  total_amount: number;
  recorded_at: string;
  created_at: string;
  machine_meters: {
    meter_number: string;
    label: string;
    fuel_type: string;
  };
  profiles: {
    name: string;
  };
}

interface MeterReadingsHistoryProps {
  userId?: string;
  limit?: number;
}

const fuelTypeOrder = ["Petrol", "Diesel", "Hi-Octane"];

const formatDate = (value: string) =>
  new Date(value)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export default function MeterReadingsHistory({
  userId,
  limit = 5,
}: MeterReadingsHistoryProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<MeterReadingRecord[]>([]);
  const [configuredFuelTypes, setConfiguredFuelTypes] = useState<string[]>([]);
  const [selectedFuelType, setSelectedFuelType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function loadReadings() {
      setLoading(true);
      setError(null);
      try {
        const [result, config] = await Promise.all([
          getShiftMeterReadings(userId, limit),
          getPumpConfig(),
        ]);
        if (result.success) {
          setReadings(result.data as MeterReadingRecord[]);
        } else {
          setError(result.error || "Failed to load readings");
        }
        setConfiguredFuelTypes([
          ...new Set(
            config.meters
              .filter((meter) => meter.status === "active" && meter.fuel_type)
              .map((meter) => meter.fuel_type)
          ),
        ]);
      } catch (err) {
        console.error("Error loading meter readings:", err);
        setError("Failed to load meter readings");
      } finally {
        setLoading(false);
      }
    }

    loadReadings();
  }, [mounted, userId, limit]);

  const groupedReadings = useMemo(() => {
    const grouped: Record<string, MeterReadingRecord[]> = {};

    configuredFuelTypes.forEach((fuelType) => {
      grouped[fuelType] = [];
    });

    readings.forEach((reading) => {
      const fuelType = reading.machine_meters.fuel_type || "Other";
      if (!grouped[fuelType]) {
        grouped[fuelType] = [];
      }
      grouped[fuelType].push(reading);
    });

    const orderedFuelTypes = [
      ...fuelTypeOrder,
      ...Object.keys(grouped).filter((fuelType) => !fuelTypeOrder.includes(fuelType)).sort(),
    ];

    return orderedFuelTypes.filter((fuelType) => grouped[fuelType]).map((fuelType) => ({
      fuelType,
      readings: grouped[fuelType] || [],
    }));
  }, [configuredFuelTypes, readings]);

  const activeFuelGroup = groupedReadings.find(({ fuelType }) => fuelType === selectedFuelType)
    ?? groupedReadings[0];
  const activeFuelType = activeFuelGroup?.fuelType ?? "";
  const activeFuelReadings = activeFuelGroup?.readings ?? [];
  const activeFuelTypeIndex = groupedReadings.findIndex(
    ({ fuelType }) => fuelType === activeFuelType
  );

  if (!mounted || loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <div className="h-6 w-48 bg-zinc-800 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-800/40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <p className="text-rose-400 text-sm">{error}</p>
      </div>
    );
  }

  if (groupedReadings.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <h3 className="font-semibold text-zinc-200 mb-2">Meter Readings Audit</h3>
        <p className="text-sm text-zinc-400">No fuel products or meter readings are configured.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="font-semibold text-white">Meter Readings Audit</h3>
          <p className="text-xs text-zinc-400">Last {readings.length} recorded readings</p>
        </div>
        <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <div>
        <div
          className="flex gap-2 overflow-x-auto border-b border-zinc-800 pb-2"
          role="tablist"
          aria-label="Fuel type"
        >
          {groupedReadings.map(({ fuelType, readings: fuelReadings }, index) => {
            const isSelected = activeFuelGroup?.fuelType === fuelType;
            const activeTabClass = fuelType === "Petrol"
              ? "border-amber-400 bg-amber-500/10 text-amber-300"
              : fuelType === "Diesel"
                ? "border-rose-400 bg-rose-500/10 text-rose-300"
                : "border-cyan-400 bg-cyan-500/10 text-cyan-300";

            return (
              <button
                key={fuelType}
                type="button"
                role="tab"
                id={`fuel-tab-${index}`}
                aria-selected={isSelected}
                aria-controls={`fuel-panel-${index}`}
                onClick={() => setSelectedFuelType(fuelType)}
                className={`shrink-0 rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  isSelected
                    ? activeTabClass
                    : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {fuelType}
                <span className="ml-2 text-xs text-zinc-500">{fuelReadings.length}</span>
              </button>
            );
          })}
        </div>

        {activeFuelGroup && (
          <section
            id={`fuel-panel-${activeFuelTypeIndex}`}
            role="tabpanel"
            aria-labelledby={`fuel-tab-${activeFuelTypeIndex}`}
            className="space-y-3 pt-3"
          >
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                {activeFuelType} Totals
              </h5>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/60 px-3 py-2">
                  <p className="text-xs text-zinc-500">Total Liters Dispensed</p>
                  <p className="mt-0.5 text-base font-bold text-white">
                    {activeFuelReadings.reduce((total, reading) => total + Number(reading.liters_dispensed || 0), 0).toLocaleString("en-PK", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} L
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/60 px-3 py-2">
                  <p className="text-xs text-zinc-500">Total Amount (Rs)</p>
                  <p className="mt-0.5 text-base font-bold text-emerald-300">
                    Rs. {activeFuelReadings.reduce((total, reading) => total + Number(reading.total_amount || 0), 0).toLocaleString("en-PK", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg border px-4 py-3 ${
                activeFuelType === "Petrol"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : activeFuelType === "Diesel"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-cyan-500/30 bg-cyan-500/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4
                    className={`text-sm font-semibold ${
                      activeFuelType === "Petrol"
                        ? "text-amber-400"
                        : activeFuelType === "Diesel"
                        ? "text-red-400"
                        : "text-cyan-400"
                    }`}
                  >
                    {activeFuelType}
                  </h4>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                    {activeFuelReadings.length} record(s)
                  </p>
                </div>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                  Fuel Group
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {activeFuelReadings.length === 0 ? (
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-4 text-sm text-zinc-500">
                  No {activeFuelType} readings in this window.
                </div>
              ) : null}

              {activeFuelReadings.map((reading) => {
                const date = formatDate(reading.recorded_at);
                const time = formatTime(reading.recorded_at);

                return (
                  <article key={reading.id} className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
                    <div className="grid grid-cols-2 items-center gap-x-3 gap-y-2 sm:grid-cols-4 2xl:grid-cols-8">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Worker</p>
                        <p className="truncate text-sm font-semibold text-white">{reading.profiles.name}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Date / Time</p>
                        <p className="truncate font-mono text-xs text-zinc-200">{date} {time}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Nozzle / Fuel</p>
                        <p className="truncate text-sm text-zinc-200">
                          {reading.machine_meters.label} <span className="text-zinc-500">({reading.machine_meters.meter_number})</span>
                        </p>
                        <p className="truncate text-xs text-zinc-400">{reading.machine_meters.fuel_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Opening</p>
                        <p className="font-mono text-sm font-medium text-zinc-100">{reading.opening_reading.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Closing</p>
                        <p className="font-mono text-sm font-medium text-zinc-100">{reading.closing_reading.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Price / Liter</p>
                        <p className="truncate font-mono text-sm text-zinc-100">
                          Rs. {Number(reading.price_per_liter || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Liters</p>
                        <p className="font-mono text-sm font-semibold text-emerald-300">{reading.liters_dispensed.toFixed(2)} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Amount</p>
                        <p className="truncate font-mono text-sm font-semibold text-emerald-300">
                          Rs. {Number(reading.total_amount || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
