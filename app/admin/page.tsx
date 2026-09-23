import { getAdminOverviewData } from "@/actions/admin-actions";
import AdminOverviewLive from "@/components/admin/AdminOverviewLive";

export const metadata = {
  title: "Overview - Sales & Shortages | Station Admin Hub",
  description: "Executive real-time audit of fuel sales, meter readings, cash collections, and shortages.",
};

export default async function AdminOverviewPage() {
  const data = await getAdminOverviewData();

  return <AdminOverviewLive initialData={data} />;
}
