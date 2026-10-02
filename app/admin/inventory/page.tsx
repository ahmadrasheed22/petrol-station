import TankStatus from "@/components/TankStatus";
import TankerDeliveryLogs from "@/components/admin/TankerDeliveryLogs";
import { getTankerDeliveryLogs } from "@/actions/inventory-logs-actions";

export const metadata = {
  title: "Inventory & Tanks | Station Admin Hub",
  description:
    "Monitor live fuel tank storage levels, volume capacities, and tanker delivery history.",
};

export default async function AdminInventoryPage() {
  const { logs } = await getTankerDeliveryLogs();

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Inventory &amp; Storage Tanks
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Live underground tank dip levels and volume capacities. Tanker
          deliveries are recorded from the Worker terminal.
        </p>
      </div>

      {/* Live Tank Storage & Calculator (Owner read-only view) */}
      <TankStatus />

      {/* Tanker Delivery Logs */}
      <TankerDeliveryLogs logs={logs} />
    </div>
  );
}
