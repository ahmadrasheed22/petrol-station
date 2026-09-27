import { getAdminOverviewData } from "@/actions/admin-actions";
import AdminOverviewLive from "@/components/admin/AdminOverviewLive";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meter Readings | Station Admin Hub",
  description: "Audit uploaded meter readings, liters dispensed, and shift reconciliation.",
};

export default async function AdminMeterReadingsPage() {
  const data = await getAdminOverviewData();

  return <AdminOverviewLive initialData={data} view="meter-readings" />;
}