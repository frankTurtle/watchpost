import { getDataProvider, isDemoMode } from "@/lib/data";
import { summarizeMonitor, overallStatus } from "@/lib/status";
import { UptimeBar } from "./components/uptime-bar";

export const revalidate = 60;

export default async function Home() {
  const provider = getDataProvider();
  const monitorsWithChecks = await provider.listMonitorsWithChecks(24);
  const summaries = monitorsWithChecks.map((m) => summarizeMonitor(m));
  const overall = overallStatus(summaries);

  const statusColor = {
    operational: "alert-success",
    degraded: "alert-warning",
    outage: "alert-error",
    unknown: "alert-info",
  }[overall];

  const statusMessage = {
    operational: "All systems operational",
    degraded: "Degraded performance",
    outage: "Service outage",
    unknown: "No monitors yet",
  }[overall];

  const isDemo = isDemoMode();

  return (
    <div className="space-y-8">
      {/* Overall Status Banner */}
      <div className={`alert ${statusColor}`}>
        <div>
          <h2 className="text-lg font-semibold">{statusMessage}</h2>
          {overall === "unknown" && (
            <p className="text-sm mt-1">
              Visit{" "}
              <a href="/admin" className="link">
                /admin
              </a>{" "}
              to add monitors.
            </p>
          )}
        </div>
      </div>

      {/* Demo Mode Notice */}
      {isDemo && (
        <div className="alert alert-info">
          <div>
            <p className="text-sm">
              This instance is running in demo mode with in-memory data.
            </p>
          </div>
        </div>
      )}

      {/* Monitor Cards */}
      {summaries.length > 0 && (
        <div className="grid gap-4">
          {summaries.map((summary) => {
            const statusBadgeColor = {
              up: "badge-success",
              down: "badge-error",
              degraded: "badge-warning",
              unknown: "badge-ghost",
            }[summary.status];

            return (
              <div
                key={summary.monitor.id}
                className="card bg-base-100 border border-base-300"
              >
                <div className="card-body">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="card-title text-lg">
                        {summary.monitor.name}
                      </h3>
                      <p className="text-sm text-base-content/50">
                        {summary.monitor.url}
                      </p>
                    </div>
                    <div className={`badge ${statusBadgeColor}`}>
                      {summary.status}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    {summary.uptime24h !== null && (
                      <div>
                        <p className="text-base-content/60">24h Uptime</p>
                        <p className="text-lg font-semibold">
                          {(summary.uptime24h * 100).toFixed(2)}%
                        </p>
                      </div>
                    )}
                    {summary.avgLatencyMs !== null && (
                      <div>
                        <p className="text-base-content/60">Avg Latency</p>
                        <p className="text-lg font-semibold">
                          {summary.avgLatencyMs}ms
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Uptime Bar */}
                  <div className="mb-4">
                    <p className="text-xs text-base-content/60 mb-2">
                      Last 24 hours (30-min buckets)
                    </p>
                    <UptimeBar buckets={summary.buckets} />
                  </div>

                  {/* Last Error */}
                  {summary.status === "down" && summary.lastError && (
                    <div className="text-sm text-error">
                      <p className="font-semibold">Last error:</p>
                      <p>{summary.lastError}</p>
                    </div>
                  )}

                  {/* Last Check Time */}
                  {summary.lastCheck && (
                    <p className="text-xs text-base-content/50">
                      Last check:{" "}
                      {new Date(summary.lastCheck.checked_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
