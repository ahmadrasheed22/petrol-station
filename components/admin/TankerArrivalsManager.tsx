"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  recordTankerArrival,
  type ActiveFuelTank,
  type TankerArrivalRecord,
} from "@/actions/tanker-arrival-actions";

interface Props {
  tanks: ActiveFuelTank[];
  arrivals: TankerArrivalRecord[];
  loadError: string | null;
}

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatNumber(value: number) {
  return Number(value).toLocaleString("en-PK", { maximumFractionDigits: 2 });
}

export default function TankerArrivalsManager({ tanks, arrivals, loadError }: Props) {
  const router = useRouter();
  const tankSelectId = useId();
  const litersInputId = useId();
  const amountInputId = useId();
  const arrivedAtInputId = useId();
  const [tankId, setTankId] = useState(tanks[0]?.id || "");
  const [receivedLiters, setReceivedLiters] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [arrivedAt, setArrivedAt] = useState(localDateTimeValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const selectedTank = tanks.find((tank) => tank.id === tankId);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await recordTankerArrival({
        tankId,
        receivedLiters: Number(receivedLiters),
        totalAmount: Number(totalAmount),
        arrivedAt,
      });

      if (!result.success) {
        setMessage({ text: result.error || "Unable to record this arrival.", isError: true });
        return;
      }

      setReceivedLiters("");
      setTotalAmount("");
      setArrivedAt(localDateTimeValue());
      setMessage({ text: "Tanker arrival recorded and tank inventory updated.", isError: false });
      router.refresh();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Unable to record this arrival.",
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300" role="alert">
          Could not load tanker data: {loadError}
        </p>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Record delivery</h2>
              <p className="mt-1 text-sm text-zinc-500">Inventory is credited when the audit record is saved.</p>
            </div>
            <span className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-300">
              Owner entry
            </span>
          </div>

          {message && (
            <p
              className={`rounded-lg border p-3 text-sm ${
                message.isError
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
              role={message.isError ? "alert" : "status"}
            >
              {message.text}
            </p>
          )}

          <div>
            <label htmlFor={tankSelectId} className="mb-1.5 block text-xs font-medium text-zinc-300">Fuel tank</label>
            <select
              id={tankSelectId}
              value={tankId}
              onChange={(event) => setTankId(event.target.value)}
              disabled={isSubmitting || tanks.length === 0}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 disabled:opacity-50"
            >
              {tanks.length === 0 && <option value="">No active tanks available</option>}
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>{tank.tank_number} · {tank.fuel_type}</option>
              ))}
            </select>
            {selectedTank && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Current stock: {formatNumber(selectedTank.current_liters)} L / {formatNumber(selectedTank.capacity_liters)} L
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={litersInputId} className="mb-1.5 block text-xs font-medium text-zinc-300">Received liters</label>
              <div className="relative">
                <input
                  id={litersInputId}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  required
                  value={receivedLiters}
                  onChange={(event) => setReceivedLiters(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 12,000"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-9 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-amber-500 disabled:opacity-50"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-500">L</span>
              </div>
            </div>
            <div>
              <label htmlFor={amountInputId} className="mb-1.5 block text-xs font-medium text-zinc-300">Total invoice amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-500">Rs.</span>
                <input
                  id={amountInputId}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  required
                  value={totalAmount}
                  onChange={(event) => setTotalAmount(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 3,250,000"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2.5 pl-11 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={arrivedAtInputId} className="mb-1.5 block text-xs font-medium text-zinc-300">Arrival date and time</label>
            <input
              id={arrivedAtInputId}
              type="datetime-local"
              required
              value={arrivedAt}
              onChange={(event) => setArrivedAt(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || tanks.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? "Recording arrival..." : "Record tanker arrival"}
          </button>
        </form>

        <aside className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Selected tank</p>
            {selectedTank ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-white">{selectedTank.tank_number}</h2>
                <p className="mt-1 text-sm text-zinc-400">{selectedTank.fuel_type}</p>
                <div className="mt-8 border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-500">Stock after this delivery</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-emerald-300">
                    {formatNumber(Number(selectedTank.current_liters) + (Number(receivedLiters) || 0))} <span className="text-sm font-normal text-zinc-500">L</span>
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">An active tank is required to record a delivery.</p>
            )}
          </div>
          <p className="mt-8 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
            Saving this entry adds the received volume to tank stock and writes the arrival audit record together.
          </p>
        </aside>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Recent tanker arrivals</h2>
            <p className="mt-1 text-xs text-zinc-500">Latest {arrivals.length} recorded deliveries</p>
          </div>
          <span className="font-mono text-xs text-zinc-500">{arrivals.length.toString().padStart(2, "0")}</span>
        </div>

        {arrivals.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-zinc-950/60 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Arrival time</th>
                  <th className="px-4 py-3 font-semibold">Tank</th>
                  <th className="px-4 py-3 text-right font-semibold">Received</th>
                  <th className="px-4 py-3 text-right font-semibold">Invoice amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {arrivals.map((arrival) => (
                  <tr key={arrival.id} className="text-zinc-300 hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap px-4 py-3.5 text-zinc-400">
                      {new Date(arrival.arrived_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-zinc-100">{arrival.tank[0]?.tank_number || "Deleted tank"}</span>
                      <span className="ml-2 text-xs text-zinc-500">{arrival.tank[0]?.fuel_type || ""}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-emerald-300">{formatNumber(arrival.received_liters)} L</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-zinc-200">Rs. {formatNumber(arrival.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-zinc-500">No tanker arrivals have been recorded yet.</p>
        )}
      </section>
    </div>
  );
}