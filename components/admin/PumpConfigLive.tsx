"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import PumpConfigEditForms, {
  type Machine,
  type Meter,
  type PumpConfigFormData,
  type Tank,
} from "@/components/admin/PumpConfigEditForms";
import PumpConfigTabs, { type PumpConfigTab } from "@/components/admin/PumpConfigTabs";

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
  const [activeTab, setActiveTab] = useState<PumpConfigTab>("tanks");
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editingMeter, setEditingMeter] = useState<Meter | null>(null);
  const [editFormData, setEditFormData] = useState<PumpConfigFormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Sync local state with server data when it changes via router.refresh()
  useEffect(() => {
    setTanks(initialData.tanks);
    setMachines(initialData.machines);
    setMeters(initialData.meters);
  }, [initialData]);

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
        router.refresh();
        setIsLoading(false);
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
        router.refresh();
        setIsLoading(false);
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
        router.refresh();
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to add meter");
      setIsLoading(false);
    }
  };

  // Edit handlers
  const handleEditTank = (tank: Tank) => {
    setEditingTank(tank);
    setEditFormData(tank);
  };

  const handleEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    setEditFormData(machine);
  };

  const handleEditMeter = (meter: Meter) => {
    setEditingMeter(meter);
    setEditFormData(meter);
  };

  const handleUpdateTank = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTank) return;
    
    setIsLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await updateFuelTank(editingTank.id, {
        tank_number: formData.get("tank_number") as string,
        fuel_type: formData.get("fuel_type") as string,
        capacity_liters: Number(formData.get("capacity_liters")),
        current_liters: Number(formData.get("current_liters")),
      });
      if (!res.success) {
        setError(res.error || "Failed to update tank");
        setIsLoading(false);
      } else {
        router.refresh();
        setIsLoading(false);
        setEditingTank(null);
        setEditFormData({});
      }
    } catch (err: any) {
      setError(err.message || "Failed to update tank");
      setIsLoading(false);
    }
  };

  const handleUpdateMachine = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMachine) return;
    
    setIsLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await updatePumpMachine(editingMachine.id, {
        machine_number: formData.get("machine_number") as string,
        fuel_type: formData.get("fuel_type") as string,
        tank_id: formData.get("tank_id") as string || null,
        status: formData.get("status") as string,
      });
      if (!res.success) {
        setError(res.error || "Failed to update machine");
        setIsLoading(false);
      } else {
        router.refresh();
        setIsLoading(false);
        setEditingMachine(null);
        setEditFormData({});
      }
    } catch (err: any) {
      setError(err.message || "Failed to update machine");
      setIsLoading(false);
    }
  };

  const handleUpdateMeter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMeter) return;
    
    setIsLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await updateMachineMeter(editingMeter.id, {
        machine_id: formData.get("machine_id") as string,
        meter_number: formData.get("meter_number") as string,
        label: formData.get("label") as string,
        initial_reading: Number(formData.get("initial_reading")),
        current_reading: Number(formData.get("current_reading")),
        fuel_type: formData.get("fuel_type") as string,
        status: formData.get("status") as string,
      });
      if (!res.success) {
        setError(res.error || "Failed to update meter");
        setIsLoading(false);
      } else {
        router.refresh();
        setIsLoading(false);
        setEditingMeter(null);
        setEditFormData({});
      }
    } catch (err: any) {
      setError(err.message || "Failed to update meter");
      setIsLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    
    setIsLoading(true);
    setError("");
    try {
      let res: { success: boolean, error?: string } = { success: true };
      if (type === "tank") res = await deleteFuelTank(id);
      if (type === "machine") res = await deletePumpMachine(id);
      if (type === "meter") res = await deleteMachineMeter(id);
      
      if (!res.success) {
        setError(res.error || "Failed to delete");
        setIsLoading(false);
      } else {
        router.refresh();
        setIsLoading(false);
        
        if (type === "tank") {
          setTanks(tanks.filter(t => t.id !== id));
        } else if (type === "machine") {
          setMachines(machines.filter(m => m.id !== id));
        } else if (type === "meter") {
          setMeters(meters.filter(m => m.id !== id));
        }
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

      <PumpConfigEditForms
        editingTank={editingTank}
        editingMachine={editingMachine}
        editingMeter={editingMeter}
        editFormData={editFormData}
        tanks={tanks}
        machines={machines}
        isLoading={isLoading}
        onUpdateTank={handleUpdateTank}
        onUpdateMachine={handleUpdateMachine}
        onUpdateMeter={handleUpdateMeter}
        onCancelTank={() => { setEditingTank(null); setEditFormData({}); }}
        onCancelMachine={() => { setEditingMachine(null); setEditFormData({}); }}
        onCancelMeter={() => { setEditingMeter(null); setEditFormData({}); }}
      />

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

      <PumpConfigTabs
        activeTab={activeTab}
        tanks={tanks}
        machines={machines}
        meters={meters}
        isLoading={isLoading}
        onEditTank={handleEditTank}
        onEditMachine={handleEditMachine}
        onEditMeter={handleEditMeter}
        onDelete={handleDelete}
        onAddTank={handleAddTank}
        onAddMachine={handleAddMachine}
        onAddMeter={handleAddMeter}
      />
    </div>
  );
}