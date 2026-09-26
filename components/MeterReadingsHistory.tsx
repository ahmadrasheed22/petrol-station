"use client";

import { useEffect, useMemo, useState } from "react";
import { getShiftMeterReadings } from "@/actions/pump-actions";

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
        const result = await getShiftMeterReadings(userId, limit);
        if (result.success) {
          setReadings(result.data as MeterReadingRecord[]);
        } else {
          setError(result.error || "Failed to load readings");
        }
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

    readings.forEach((reading) => {
      const fuelType = reading.machine_meters.fuel_type || "Other";
      if (!grouped[fuelType]) {
        grouped[fuelType] = [];
      }
      grouped[fuelType].push(reading);
    });

    const orderedFuelTypes = [
      ...fuelTypeOrder,
      ...Object.keys(grouped).filter((fuelType) => !fuelTypeOrder.includes(fuelType)),
    ];

    return orderedFuelTypes.map((fuelType) => ({
      fuelType,
      readings: grouped[fuelType] || [],
    }));
  }, [readings]);

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

  if (readings.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <h3 className="font-semibold text-zinc-200 mb-2">Meter Readings Audit</h3>
        <p className="text-sm text-zinc-400">No meter readings recorded yet.</p>
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

      <div className="space-y-6">
        {groupedReadings.map(({ fuelType, readings: fuelReadings }) => (
          <section key={fuelType} className="space-y-3">
            <div
              className={`rounded-lg border px-4 py-3 ${
                fuelType === "Petrol"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : fuelType === "Diesel"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-cyan-500/30 bg-cyan-500/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4
                    className={`text-sm font-semibold ${
                      fuelType === "Petrol"
                        ? "text-amber-400"
                        : fuelType === "Diesel"
                        ? "text-red-400"
                        : "text-cyan-400"
                    }`}
                  >
                    {fuelType}
                  </h4>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                    {fuelReadings.length} record(s)
                  </p>
                </div>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                  Fuel Group
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {fuelReadings.length === 0 ? (
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-4 text-sm text-zinc-500">
                  No {fuelType} readings in this window.
                </div>
              ) : null}

              {fuelReadings.map((reading) => {
                const date = formatDate(reading.recorded_at);
                const time = formatTime(reading.recorded_at);

                return (
                  <article key={reading.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Worker</p>
                          <p className="text-xl font-semibold text-white">{reading.profiles.name}</p>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Date</p>
                            <p className="text-lg font-bold text-zinc-100">{date}</p>
                          </div>
                          <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Time</p>
                            <p className="font-mono text-lg font-semibold text-zinc-100">{time}</p>
                          </div>
                        </div>

                        <div className="text-xs text-zinc-400">
                          Meter {reading.machine_meters.label} <span className="text-zinc-600">({reading.machine_meters.meter_number})</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            reading.machine_meters.fuel_type === "Petrol"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : reading.machine_meters.fuel_type === "Diesel"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          }`}
                        >
                          {reading.machine_meters.fuel_type}
                        </span>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/80">Liters Dispensed</p>
                          <p className="text-xl font-bold text-emerald-300">
                            {reading.liters_dispensed.toFixed(2)}L
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2">
                        <span className="text-zinc-500 text-[11px] uppercase tracking-[0.18em]">Opening</span>
                        <div className="font-mono text-lg font-semibold text-zinc-100">
                          {reading.opening_reading.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2">
                        <span className="text-zinc-500 text-[11px] uppercase tracking-[0.18em]">Closing</span>
                        <div className="font-mono text-lg font-semibold text-zinc-100">
                          {reading.closing_reading.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2">
                        <span className="text-zinc-500 text-[11px] uppercase tracking-[0.18em]">Price / Liter</span>
                        <div className="font-mono text-lg font-semibold text-zinc-100">
                          Rs. {Number(reading.price_per_liter || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                        <span className="text-emerald-300/80 text-[11px] uppercase tracking-[0.18em]">Total Amount</span>
                        <div className="font-mono text-xl font-bold text-emerald-300">
                          Rs. {Number(reading.total_amount || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
