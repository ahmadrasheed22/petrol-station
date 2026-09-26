"use client";

import { useEffect, useState } from "react";
import { getShiftMeterReadings } from "@/actions/pump-actions";

interface MeterReadingRecord {
  id: string;
  meter_id: string;
  worker_id: string;
  opening_reading: number;
  closing_reading: number;
  liters_dispensed: number;
  recorded_at: string;
  created_at: string;
  machine_meters: {
    meter_number: string;
    label: string;
    fuel_type: string;
  };
  profiles: {
    name: string;
    phone: string;
  };
}

interface MeterReadingsHistoryProps {
  userId?: string;
  limit?: number;
}

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

  if (!mounted || loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
        <div className="h-6 w-48 bg-zinc-800 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800/40 rounded-lg" />
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
        <h3 className="font-semibold text-zinc-200 mb-2">Recent Meter Readings</h3>
        <p className="text-sm text-zinc-400">No meter readings recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
        <div>
          <h3 className="font-semibold text-white">Recent Meter Readings</h3>
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

      <div className="space-y-2">
        {readings.map((reading) => (
          <div key={reading.id} className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3 text-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-medium text-white">
                  {reading.machine_meters.label}
                </div>
                <div className="text-xs text-zinc-400">
                  {reading.profiles.name} • {reading.machine_meters.fuel_type}
                </div>
              </div>
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  reading.machine_meters.fuel_type === "Petrol"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : reading.machine_meters.fuel_type === "Diesel"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                }`}
              >
                {reading.liters_dispensed.toFixed(2)}L
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-zinc-900/50 rounded px-2 py-1.5">
                <span className="text-zinc-500">Opening</span>
                <div className="font-mono font-semibold text-zinc-200">
                  {reading.opening_reading.toFixed(2)}
                </div>
              </div>
              <div className="bg-zinc-900/50 rounded px-2 py-1.5">
                <span className="text-zinc-500">Closing</span>
                <div className="font-mono font-semibold text-zinc-200">
                  {reading.closing_reading.toFixed(2)}
                </div>
              </div>
              <div className="bg-zinc-900/50 rounded px-2 py-1.5">
                <span className="text-zinc-500">Time</span>
                <div className="font-mono font-semibold text-zinc-200">
                  {new Date(reading.recorded_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
