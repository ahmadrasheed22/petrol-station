import { getAdminOverviewData } from "@/actions/admin-actions";
import AdminOverviewLive from "@/components/admin/AdminOverviewLive";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Overview | Station Admin Hub",
  description: "Live performance and cash reconciliation for your station.",
};

export default async function AdminOverviewPage() {
  const data = await getAdminOverviewData();

  return <AdminOverviewLive initialData={data} view="overview" />;
}
