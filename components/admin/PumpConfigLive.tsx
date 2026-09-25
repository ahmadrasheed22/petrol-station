"use client";

import { useState } from "react";
import {
  addFuelTank,
  updateFuelTank,
  deleteFuelTank,
  addPumpMachine,
  updatePumpMachine,
  deletePumpMachine,
  addMachineMeter,
  updateMachineMeter,
  deleteMachineMeter,
} from "@/actions/pump-actions";

type Tank = { id: string; tank_number: string; fuel_type: string; capacity_liters: number; current_liters: number };
type Machine = { id: string; machine_number: string; fuel_type: string; tank_id: string | null; status: string };
type Meter = { id: string; machine_id: string; meter_number: string; label: string; initial_reading: number; current_reading: number; fuel_type: string; status: string };

interface Props {
  initialData: {
    tanks: Tank[];
    machines: Machine[];
    meters: Meter[];
  };
}

export default function PumpConfigLive({ initialData }: Props) {
  const [tanks, setTanks] = useState(initialData.tanks);
  const [machines, setMachines] = useState(initialData.machines);
  const [meters, setMeters] = useState(initialData.meters);
  const [activeTab, setActiveTab] = useState<"tanks" | "machines" | "meters">("tanks");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddTank = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await addFuelTank({
        tank_number: formData.get("tank_number") as string,
        fuel_type: formData.get("fuel_type") as string,
        capacity_liters: Number(formData.get("capacity_liters")),
        current_liters: Number(formData.get("current_liters")),
      });
      if (!res.success) {
        setError(res.error || "Failed to add tank");
        setIsLoading(false);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Failed to add tank");
      setIsLoading(false);
    }
  };

  const handleAddMachine = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await addPumpMachine({
        machine_number: formData.get("machine_number") as string,
        fuel_type: formData.get("fuel_type") as string,
        tank_id: formData.get("tank_id") as string || null,
        status: formData.get("status") as string,
      });
      if (!res.success) {
        setError(res.error || "Failed to add machine");
        setIsLoading(false);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Failed to add machine");
      setIsLoading(false);
    }
  };

  const handleAddMeter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await addMachineMeter({
        machine_id: formData.get("machine_id") as string,
        meter_number: formData.get("meter_number") as string,
        label: formData.get("label") as string,
        initial_reading: Number(formData.get("initial_reading")),
        current_reading: Number(formData.get("current_reading")),
        fuel_type: formData.get("fuel_type") as string,
        status: formData.get("status") as string,
      });
      if (!res.success) {
        setError(res.error || "Failed to add meter");
        setIsLoading(false);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Failed to add meter");
      setIsLoading(false);
    }
  };

  const deleteItem = async (type: string, id: string) => {
    if (!window.confirm("Are you sure?")) return;
    setIsLoading(true);
    try {
      let res: { success: boolean, error?: string } = { success: true };
      if (type === "tank") res = await deleteFuelTank(id);
      if (type === "machine") res = await deletePumpMachine(id);
      if (type === "meter") res = await deleteMachineMeter(id);
      
      if (!res.success) {
        setError(res.error || "Failed to delete");
        setIsLoading(false);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Hardware Configuration</h2>
          <p className="text-sm text-zinc-400">Manage tanks, dispensing machines, and meters.</p>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">{error}</div>}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-zinc-800 pb-2">
        {(["tanks", "machines", "meters"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tanks Tab */}
      {activeTab === "tanks" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tanks.map((tank) => (
              <div key={tank.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{tank.tank_number}</h3>
                  <button onClick={() => deleteItem("tank", tank.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Delete</button>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>Fuel Type: <span className="text-amber-400 font-medium">{tank.fuel_type}</span></p>
                  <p>Capacity: {tank.capacity_liters} L</p>
                  <p>Current: {tank.current_liters} L</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTank} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl">
            <h3 className="font-bold text-white border-b border-zinc-800 pb-2">Add New Tank</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="tank_number" placeholder="Tank Number (e.g., Tank 04)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <select name="fuel_type" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Hi-Octane">Hi-Octane</option>
              </select>
              <input name="capacity_liters" type="number" placeholder="Capacity (Liters)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <input name="current_liters" type="number" placeholder="Current (Liters)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            </div>
            <button disabled={isLoading} type="submit" className="w-full bg-amber-500 text-zinc-950 font-bold rounded-lg p-2 text-sm hover:bg-amber-400 disabled:opacity-50">
              Add Tank
            </button>
          </form>
        </div>
      )}

      {/* Machines Tab */}
      {activeTab === "machines" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map((machine) => (
              <div key={machine.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{machine.machine_number}</h3>
                  <button onClick={() => deleteItem("machine", machine.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Delete</button>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>Fuel Type: <span className="text-amber-400 font-medium">{machine.fuel_type}</span></p>
                  <p>Tank ID: {machine.tank_id ? tanks.find((t) => t.id === machine.tank_id)?.tank_number : "None"}</p>
                  <p>Status: <span className={machine.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}>{machine.status}</span></p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddMachine} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl">
            <h3 className="font-bold text-white border-b border-zinc-800 pb-2">Add New Dispensing Machine</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="machine_number" placeholder="Machine Number (e.g., Dispenser 03)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <select name="fuel_type" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Hi-Octane">Hi-Octane</option>
              </select>
              <select name="tank_id" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
                <option value="">Select Tank</option>
                {tanks.map(t => <option key={t.id} value={t.id}>{t.tank_number} ({t.fuel_type})</option>)}
              </select>
              <select name="status" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <button disabled={isLoading} type="submit" className="w-full bg-amber-500 text-zinc-950 font-bold rounded-lg p-2 text-sm hover:bg-amber-400 disabled:opacity-50">
              Add Dispensing Machine
            </button>
          </form>
        </div>
      )}

      {/* Meters Tab */}
      {activeTab === "meters" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meters.map((meter) => (
              <div key={meter.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{meter.label} <span className="text-zinc-500 text-xs">({meter.meter_number})</span></h3>
                  <button onClick={() => deleteItem("meter", meter.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Delete</button>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>Machine: {machines.find(m => m.id === meter.machine_id)?.machine_number}</p>
                  <p>Fuel Type: <span className="text-amber-400 font-medium">{meter.fuel_type}</span></p>
                  <p>Current Reading: {meter.current_reading}</p>
                  <p>Status: <span className={meter.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}>{meter.status}</span></p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddMeter} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl">
            <h3 className="font-bold text-white border-b border-zinc-800 pb-2">Add New Meter / Nozzle</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="meter_number" placeholder="Meter Number (e.g., Meter #3)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <input name="label" placeholder="Label (e.g., Nozzle C - Fast Lane)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <select name="machine_id" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
                <option value="">Select Machine</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.machine_number} ({m.fuel_type})</option>)}
              </select>
              <select name="fuel_type" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Hi-Octane">Hi-Octane</option>
              </select>
              <input name="initial_reading" type="number" step="0.1" placeholder="Initial Reading" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <input name="current_reading" type="number" step="0.1" placeholder="Current Reading" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <select name="status" required className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <button disabled={isLoading} type="submit" className="w-full bg-amber-500 text-zinc-950 font-bold rounded-lg p-2 text-sm hover:bg-amber-400 disabled:opacity-50">
              Add Meter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
