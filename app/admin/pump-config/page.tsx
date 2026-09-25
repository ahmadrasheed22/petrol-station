import { getPumpConfig } from "@/actions/pump-actions";
import PumpConfigLive from "@/components/admin/PumpConfigLive";

export const metadata = {
  title: "Pump Config | Station Admin Hub",
  description: "Hardware configuration for fuel tanks, dispensers, and meters.",
};

export default async function PumpConfigPage() {
  const data = await getPumpConfig();
  return <PumpConfigLive initialData={data} />;
}
