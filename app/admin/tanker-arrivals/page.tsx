import { getTankerArrivalData } from "@/actions/tanker-arrival-actions";
import TankerArrivalsManager from "@/components/admin/TankerArrivalsManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tanker Arrivals | Station Admin Hub",
  description: "Record and audit fuel tanker deliveries into station tanks.",
};

export default async function TankerArrivalsPage() {
  const data = await getTankerArrivalData();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Inventory Control</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Tanker Arrivals</h1>
        <p className="mt-1 text-sm text-zinc-400">Record decanting and reconcile each delivery against its tank.</p>
      </header>
      <TankerArrivalsManager tanks={data.tanks} arrivals={data.arrivals} loadError={data.error} />
    </div>
  );
}