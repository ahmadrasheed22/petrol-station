import type { FormEventHandler } from "react";

export type Tank = { id: string; tank_number: string; fuel_type: string; capacity_liters: number; current_liters: number };
export type Machine = { id: string; machine_number: string; fuel_type: string; tank_id: string | null; status: string };
export type Meter = { id: string; machine_id: string; meter_number: string; label: string; initial_reading: number; current_reading: number; fuel_type: string; status: string };
export type PumpConfigFormData = Partial<Tank & Machine & Meter>;

interface PumpConfigEditFormsProps {
  editingTank: Tank | null;
  editingMachine: Machine | null;
  editingMeter: Meter | null;
  editFormData: PumpConfigFormData;
  tanks: Tank[];
  machines: Machine[];
  isLoading: boolean;
  onUpdateTank: FormEventHandler<HTMLFormElement>;
  onUpdateMachine: FormEventHandler<HTMLFormElement>;
  onUpdateMeter: FormEventHandler<HTMLFormElement>;
  onCancelTank: () => void;
  onCancelMachine: () => void;
  onCancelMeter: () => void;
}

export default function PumpConfigEditForms({
  editingTank,
  editingMachine,
  editingMeter,
  editFormData,
  tanks,
  machines,
  isLoading,
  onUpdateTank,
  onUpdateMachine,
  onUpdateMeter,
  onCancelTank,
  onCancelMachine,
  onCancelMeter,
}: PumpConfigEditFormsProps) {
  return (
    <>
      {editingTank && (
        <form onSubmit={onUpdateTank} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl mx-auto">
          <h3 className="font-bold text-white border-b border-zinc-800 pb-2">Edit Tank</h3>
          <div className="grid grid-cols-2 gap-4">
            <input name="tank_number" defaultValue={editFormData.tank_number} placeholder="Tank Number" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <select name="fuel_type" defaultValue={editFormData.fuel_type} required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Hi-Octane">Hi-Octane</option>
            </select>
            <input name="capacity_liters" type="number" defaultValue={editFormData.capacity_liters} placeholder="Capacity (Liters)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <input name="current_liters" type="number" defaultValue={editFormData.current_liters} placeholder="Current (Liters)" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
          </div>
          <div className="flex gap-2">
            <button disabled={isLoading} type="submit" className="flex-1 bg-amber-500 text-zinc-950 font-bold rounded-lg p-2 text-sm hover:bg-amber-400 disabled:opacity-50">Update Tank</button>
            <button type="button" onClick={onCancelTank} className="px-4 bg-zinc-800 text-white rounded-lg p-2 text-sm hover:bg-zinc-700">Cancel</button>
          </div>
        </form>
      )}

      {editingMachine && (
        <form onSubmit={onUpdateMachine} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl mx-auto">
          <h3 className="font-bold text-white border-b border-zinc-800 pb-2">Edit Machine</h3>
          <div className="grid grid-cols-2 gap-4">
            <input name="machine_number" defaultValue={editFormData.machine_number} placeholder="Machine Number" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <select name="fuel_type" defaultValue={editFormData.fuel_type} required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Hi-Octane">Hi-Octane</option>
            </select>
            <select name="tank_id" defaultValue={editFormData.tank_id || ""} required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
              <option value="">Select Tank</option>
              {tanks.map((tank) => <option key={tank.id} value={tank.id}>{tank.tank_number} ({tank.fuel_type})</option>)}
            </select>
            <select name="status" defaultValue={editFormData.status} required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button disabled={isLoading} type="submit" className="flex-1 bg-amber-500 text-zinc-950 font-bold rounded-lg p-2 text-sm hover:bg-amber-400 disabled:opacity-50">Update Machine</button>
            <button type="button" onClick={onCancelMachine} className="px-4 bg-zinc-800 text-white rounded-lg p-2 text-sm hover:bg-zinc-700">Cancel</button>
          </div>
        </form>
      )}

      {editingMeter && (
        <form onSubmit={onUpdateMeter} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 max-w-xl mx-auto">
          <h3 className="font-bold text-white border-b border-zinc-800 pb-2">Edit Meter</h3>
          <div className="grid grid-cols-2 gap-4">
            <input name="meter_number" defaultValue={editFormData.meter_number} placeholder="Meter Number" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <input name="label" defaultValue={editFormData.label} placeholder="Label" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <select name="machine_id" defaultValue={editFormData.machine_id} required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
              <option value="">Select Machine</option>
              {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_number} ({machine.fuel_type})</option>)}
            </select>
            <select name="fuel_type" defaultValue={editFormData.fuel_type} required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Hi-Octane">Hi-Octane</option>
            </select>
            <input name="initial_reading" type="number" step="0.1" defaultValue={editFormData.initial_reading} placeholder="Initial Reading" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <input name="current_reading" type="number" step="0.1" defaultValue={editFormData.current_reading} placeholder="Current Reading" required className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            <select name="status" defaultValue={editFormData.status} required className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button disabled={isLoading} type="submit" className="flex-1 bg-amber-500 text-zinc-950 font-bold rounded-lg p-2 text-sm hover:bg-amber-400 disabled:opacity-50">Update Meter</button>
            <button type="button" onClick={onCancelMeter} className="px-4 bg-zinc-800 text-white rounded-lg p-2 text-sm hover:bg-zinc-700">Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}