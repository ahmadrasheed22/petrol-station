import TankStatus from "@/components/TankStatus";

export const metadata = {
  title: "Inventory & Tanks | Station Admin Hub",
  description: "Monitor live fuel tank storage levels and volume capacities.",
};

export default function AdminInventoryPage() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Inventory &amp; Storage Tanks
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Live underground tank dip levels and volume capacities. Tanker deliveries are recorded from the Worker terminal.
        </p>
      </div>

      {/* Live Tank Storage & Calculator (Owner read-only view) */}
      <TankStatus />
    </div>
  );
}
