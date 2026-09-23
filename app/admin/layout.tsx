import { getAuthenticatedUserProfile } from "@/lib/services/user-service";
import { isServiceRoleConfigured } from "@/actions/admin-actions";
import AdminNav from "@/components/admin/AdminNav";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Portal | Petrol Station Management",
  description: "Executive Owner Dashboard for Sales, Shortages, Workers, and Fuel Inventory",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authData = await getAuthenticatedUserProfile();

  if (!authData) {
    redirect("/login");
  }

  // Strict Role-Based Access Control: Only owners are permitted
  if (authData.profile.role !== "owner") {
    redirect("/");
  }

  const isServiceRoleReady = await isServiceRoleConfigured();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Admin Navigation */}
      <AdminNav
        ownerName={authData.profile.name || "Station Owner"}
        isServiceRoleReady={isServiceRoleReady}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/60 py-4 text-center text-xs text-zinc-600">
        <p>Petrol Station OS • Station Owner Control Center • Role-Based Protected Environment</p>
      </footer>
    </div>
  );
}
