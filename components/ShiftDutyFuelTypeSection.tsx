"use client";

export interface Meter {
  id: string;
  machine_id: string;
  meter_number: string;
  label: string;
  initial_reading: number;
  current_reading: number;
  fuel_type: string;
  status: string;
}

export interface MeterReading {
  meterId: string;
  meterLabel: string;
  machineNumber: string;
  openingReading: string;
  closingReading: string;
  pricePerLiter: string;
}

interface ShiftDutyFuelTypeSectionProps {
  fuelType: string;
  meters: Meter[];
  readings: Record<string, MeterReading>;
  onOpeningChange: (meterId: string, value: string) => void;
  onClosingChange: (meterId: string, value: string) => void;
  onPriceChange: (meterId: string, value: string) => void;
  calculateDispensed: (opening: string, closing: string) => number;
  calculateSaleAmount: (reading: MeterReading | undefined) => number;
}

export default function ShiftDutyFuelTypeSection({
  fuelType,
  meters,
  readings,
  onOpeningChange,
  onClosingChange,
  onPriceChange,
  calculateDispensed,
  calculateSaleAmount,
}: ShiftDutyFuelTypeSectionProps) {
  const totals = meters.reduce(
    (current, meter) => ({
      liters: current.liters + calculateDispensed(
        readings[meter.id]?.openingReading || "0",
        readings[meter.id]?.closingReading || ""
      ),
      rupees: current.rupees + calculateSaleAmount(readings[meter.id]),
    }),
    { liters: 0, rupees: 0 }
  );

  return (
    <section className="space-y-4">
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
            {meters.length} meter(s)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 ml-2 lg:grid-cols-2">
        {meters.map((meter) => {
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
                    onChange={(event) => onOpeningChange(meter.id, event.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Auto-filled from last closing reading, but editable if physical meter differs.
                  </p>
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
                    onChange={(event) => onClosingChange(meter.id, event.target.value)}
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
                    onChange={(event) => onPriceChange(meter.id, event.target.value)}
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

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3">
        <p className="text-xs text-zinc-400">Total {fuelType} Sold</p>
        <p className="mt-1 text-lg font-bold text-white">
          {totals.liters.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
        </p>
        <p className="mt-1 text-sm font-semibold text-emerald-300">
          Rs. {totals.rupees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </section>
  );
}
