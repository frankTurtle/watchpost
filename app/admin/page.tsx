import { getDataProvider, isDemoMode } from "@/lib/data";
import { MonitorTable } from "./monitor-table";
import { AddMonitorForm } from "./add-monitor-form";

export default async function AdminPage() {
  const provider = getDataProvider();
  const monitors = await provider.listMonitors();
  const demoMode = isDemoMode();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin</h1>

      {demoMode && (
        <div className="alert alert-info">
          <span>
            Running in demo mode — data resets on restart
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonitorTable initialMonitors={monitors} />
        </div>
        <div>
          <AddMonitorForm />
        </div>
      </div>
    </div>
  );
}
