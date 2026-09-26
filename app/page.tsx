import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { redirect } from "next/navigation";
import WorkerDashboardShell from "@/components/WorkerDashboardShell";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const authData = await getAuthenticatedUserProfile();

  if (!authData) {
    redirect("/login");
  }

  const { user, profile } = authData;
  const resolvedParams = searchParams ? await searchParams : undefined;

  if (profile.role === "owner" && resolvedParams?.view !== "worker") {
    redirect("/admin");
  }

  const isOwnerPreview = profile.role === "owner" && resolvedParams?.view === "worker";

  return (
    <WorkerDashboardShell
      userId={user.id}
      workerName={profile.name}
      role={profile.role}
      userEmail={user.email}
      isOwnerPreview={isOwnerPreview}
    />
  );
}
