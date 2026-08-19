import { DataProvider } from "./provider";
import { Monitor, Check, NewMonitor, CheckResult, MonitorWithChecks } from "@/lib/types";

interface DemoStore {
  monitors: Map<string, Monitor>;
  checks: Check[];
  nextCheckId: number;
}

let store: DemoStore | null = null;

function initializeStore(): DemoStore {
  const monitors = new Map<string, Monitor>();

  // Seed with the same 3 monitors as seed.sql
  const seedMonitors: Monitor[] = [
    {
      id: crypto.randomUUID(),
      name: "Example.com",
      url: "https://example.com",
      method: "GET",
      interval_minutes: 5,
      active: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "GitHub",
      url: "https://github.com",
      method: "GET",
      interval_minutes: 5,
      active: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Flaky demo service",
      url: "https://httpstat.us/503",
      method: "GET",
      interval_minutes: 5,
      active: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  seedMonitors.forEach((m) => monitors.set(m.id, m));

  // Generate ~24 hours of synthetic checks at 5-minute intervals per monitor
  const checks: Check[] = [];
  let checkId = 1;

  seedMonitors.forEach((monitor) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    for (let ts = twentyFourHoursAgo; ts < now; ts += 5 * 60 * 1000) {
      const isFlakyService = monitor.name === "Flaky demo service";
      const shouldFail = isFlakyService && Math.random() < 0.1;

      checks.push({
        id: checkId++,
        monitor_id: monitor.id,
        checked_at: new Date(ts).toISOString(),
        ok: !shouldFail,
        status_code: shouldFail ? 503 : 200,
        latency_ms: shouldFail ? null : Math.floor(40 + Math.random() * 360),
        error: shouldFail ? "Service Unavailable" : null,
      });
    }
  });

  return {
    monitors,
    checks,
    nextCheckId: checkId,
  };
}

function getStore(): DemoStore {
  if (!store) {
    store = initializeStore();
  }
  return store;
}

export function createDemoProvider(): DataProvider {
  return {
    async listMonitors(): Promise<Monitor[]> {
      const s = getStore();
      return Array.from(s.monitors.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },

    async listActiveMonitors(): Promise<Monitor[]> {
      const s = getStore();
      return Array.from(s.monitors.values())
        .filter((m) => m.active)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    async getMonitor(id: string): Promise<Monitor | null> {
      const s = getStore();
      return s.monitors.get(id) || null;
    },

    async createMonitor(input: NewMonitor): Promise<Monitor> {
      const s = getStore();
      const monitor: Monitor = {
        id: crypto.randomUUID(),
        ...input,
        active: true,
        created_at: new Date().toISOString(),
      };
      s.monitors.set(monitor.id, monitor);
      return monitor;
    },

    async deleteMonitor(id: string): Promise<void> {
      const s = getStore();
      s.monitors.delete(id);
      // Also delete related checks
      const idx = s.checks.findIndex((c) => c.monitor_id === id);
      if (idx >= 0) {
        s.checks = s.checks.filter((c) => c.monitor_id !== id);
      }
    },

    async setMonitorActive(id: string, active: boolean): Promise<void> {
      const s = getStore();
      const monitor = s.monitors.get(id);
      if (monitor) {
        monitor.active = active;
      }
    },

    async recordChecks(results: CheckResult[]): Promise<void> {
      const s = getStore();
      results.forEach((result) => {
        s.checks.push({
          id: s.nextCheckId++,
          ...result,
        });
      });
    },

    async listMonitorsWithChecks(sinceHours: number): Promise<MonitorWithChecks[]> {
      const s = getStore();
      const sinceTime = Date.now() - sinceHours * 60 * 60 * 1000;

      const result: MonitorWithChecks[] = Array.from(s.monitors.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((monitor) => {
          const checksForMonitor = s.checks
            .filter(
              (c) =>
                c.monitor_id === monitor.id && new Date(c.checked_at).getTime() >= sinceTime
            )
            .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime());

          return {
            ...monitor,
            checks: checksForMonitor,
          };
        });

      return result;
    },
  };
}
