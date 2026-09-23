import { getWorkersList, isServiceRoleConfigured } from "@/actions/admin-actions";
import WorkerManager from "@/components/admin/WorkerManager";

export const metadata = {
  title: "Worker Management | Station Admin Hub",
  description: "Create new worker accounts with phone-based credentials and manage station staff.",
};

export default async function ManageWorkersPage() {
  const [workers, isServiceRoleReady] = await Promise.all([
    getWorkersList(),
    isServiceRoleConfigured(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Worker Staff & Team Management
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Provision worker login credentials directly via mobile phone numbers and review your station&apos;s active workforce.
        </p>
      </div>

      {/* Main Worker Management Component */}
      <WorkerManager
        initialWorkers={workers}
        isServiceRoleReady={isServiceRoleReady}
      />
    </div>
  );
}
