import type { FormEventHandler } from "react";
import type { Machine, Meter, Tank } from "@/components/admin/PumpConfigEditForms";

export type PumpConfigTab = "tanks" | "machines" | "meters";
export type PumpConfigEntity = "tank" | "machine" | "meter";

interface PumpConfigTabsProps {
  activeTab: PumpConfigTab;
  tanks: Tank[];
  machines: Machine[];
  meters: Meter[];
  isLoading: boolean;
  onEditTank: (tank: Tank) => void;
  onEditMachine: (machine: Machine) => void;
  onEditMeter: (meter: Meter) => void;
  onDelete: (type: PumpConfigEntity, id: string) => void;
  onAddTank: FormEventHandler<HTMLFormElement>;
  onAddMachine: FormEventHandler<HTMLFormElement>;
  onAddMeter: FormEventHandler<HTMLFormElement>;
}

export default function PumpConfigTabs({
  activeTab,
  tanks,
  machines,
  meters,
  isLoading,
  onEditTank,
  onEditMachine,
  onEditMeter,
  onDelete,
  onAddTank,
  onAddMachine,
  onAddMeter,
}: PumpConfigTabsProps) {
  return (
    <>
      {activeTab === "tanks" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tanks.map((tank) => (
              <div key={tank.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{tank.tank_number}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => onEditTank(tank)} className="text-blue-400 hover:text-blue-300 text-xs font-medium">Edit</button>
                    <button onClick={() => onDelete("tank", tank.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Delete</button>
                  </div>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>Fuel Type: <span className="text-amber-400 font-medium">{tank.fuel_type}</span></p>
                  <p>Capacity: {tank.capacity_liters} L</p>
                  <p>Current: {tank.current_liters} L</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onAddTank} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl">
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

      {activeTab === "machines" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map((machine) => (
              <div key={machine.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{machine.machine_number}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => onEditMachine(machine)} className="text-blue-400 hover:text-blue-300 text-xs font-medium">Edit</button>
                    <button onClick={() => onDelete("machine", machine.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Delete</button>
                  </div>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>Fuel Type: <span className="text-amber-400 font-medium">{machine.fuel_type}</span></p>
                  <p>Tank ID: {machine.tank_id ? tanks.find((tank) => tank.id === machine.tank_id)?.tank_number : "None"}</p>
                  <p>Status: <span className={machine.status === "active" ? "text-emerald-400" : "text-zinc-500"}>{machine.status}</span></p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onAddMachine} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl">
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
                {tanks.map((tank) => <option key={tank.id} value={tank.id}>{tank.tank_number} ({tank.fuel_type})</option>)}
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

      {activeTab === "meters" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meters.map((meter) => (
              <div key={meter.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{meter.label} <span className="text-zinc-500 text-xs">({meter.meter_number})</span></h3>
                  <div className="flex gap-2">
                    <button onClick={() => onEditMeter(meter)} className="text-blue-400 hover:text-blue-300 text-xs font-medium">Edit</button>
                    <button onClick={() => onDelete("meter", meter.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Delete</button>
                  </div>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>Machine: {machines.find((machine) => machine.id === meter.machine_id)?.machine_number}</p>
                  <p>Fuel Type: <span className="text-amber-400 font-medium">{meter.fuel_type}</span></p>
                  <p>Current Reading: {meter.current_reading}</p>
                  <p>Status: <span className={meter.status === "active" ? "text-emerald-400" : "text-zinc-500"}>{meter.status}</span></p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onAddMeter} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl">
            <h3 className="font-bold text-white border-b border-zinc-800 pb-2">Add New Meter / Nozzle</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="meter_number" placeholder="Meter Number (e.g., Meter #3)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <input name="label" placeholder="Label (e.g., Nozzle C - Fast Lane)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
              <select name="machine_id" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
                <option value="">Select Machine</option>
                {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_number} ({machine.fuel_type})</option>)}
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
    </>
  );
}