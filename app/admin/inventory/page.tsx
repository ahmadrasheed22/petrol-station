import TankStatus from "@/components/TankStatus";
import InventoryArrivalForm from "@/components/InventoryArrivalForm";

export const metadata = {
  title: "Inventory & Tanks | Station Admin Hub",
  description: "Monitor live fuel tank storage levels and record bulk fuel tanker arrivals.",
};

export default function AdminInventoryPage() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Inventory & Storage Tanks
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Live underground tank dip levels, volume capacities, and supplier delivery logs.
        </p>
      </div>

      {/* Grid: Tank Status on top, Tanker Arrival Form below */}
      <div className="space-y-8">
        {/* Live Tank Storage */}
        <TankStatus />

        {/* Bulk Tanker Delivery Logging */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
          <InventoryArrivalForm />
        </div>
      </div>
    </div>
  );
}
