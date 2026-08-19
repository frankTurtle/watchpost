import { describe, it, expect, beforeEach, vi } from "vitest";
import { DataProvider } from "@/lib/data/provider";
import { NewMonitor } from "@/lib/types";

describe("demo provider", () => {
  let provider: DataProvider;

  beforeEach(async () => {
    // Reset modules to get a fresh demo store for each test
    vi.resetModules();
    const { createDemoProvider } = await import("@/lib/data/demo");
    provider = createDemoProvider();
  });

  describe("initialization", () => {
    it("seeds 3 monitors on creation", async () => {
      const monitors = await provider.listMonitors();
      expect(monitors.length).toBe(3);
    });

    it("seeded monitors have required fields", async () => {
      const monitors = await provider.listMonitors();
      monitors.forEach((m) => {
        expect(m.id).toBeDefined();
        expect(m.name).toBeDefined();
        expect(m.url).toBeDefined();
        expect(m.method).toBe("GET");
        expect(m.interval_minutes).toBe(5);
        expect(m.active).toBe(true);
        expect(m.created_at).toBeDefined();
      });
    });

    it("seeds ~24 hours of synthetic checks per monitor", async () => {
      const monitorsWithChecks = await provider.listMonitorsWithChecks(24);
      monitorsWithChecks.forEach((m) => {
        // Should have approximately 24 * 60 / 5 = 288 checks in 24 hours
        // Allow some variance
        expect(m.checks.length).toBeGreaterThan(200);
        expect(m.checks.length).toBeLessThan(400);
      });
    });
  });

  describe("listMonitors", () => {
    it("returns all monitors sorted by created_at descending", async () => {
      const monitors = await provider.listMonitors();
      expect(monitors.length).toBeGreaterThanOrEqual(3);

      // Check if sorted by created_at descending (newest first)
      for (let i = 0; i < monitors.length - 1; i++) {
        const current = new Date(monitors[i].created_at).getTime();
        const next = new Date(monitors[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe("listActiveMonitors", () => {
    it("filters to only active monitors", async () => {
      const monitors = await provider.listMonitors();
      const activeMonitors = await provider.listActiveMonitors();

      expect(activeMonitors.length).toBeLessThanOrEqual(monitors.length);
      activeMonitors.forEach((m) => {
        expect(m.active).toBe(true);
      });
    });

    it("reflects changes after setMonitorActive", async () => {
      let active = await provider.listActiveMonitors();
      const initialCount = active.length;
      const monitorToDeactivate = active[0];

      await provider.setMonitorActive(monitorToDeactivate.id, false);

      active = await provider.listActiveMonitors();
      expect(active.length).toBe(initialCount - 1);
      expect(active.some((m) => m.id === monitorToDeactivate.id)).toBe(false);
    });
  });

  describe("createMonitor", () => {
    it("creates a new monitor and appears in listMonitors", async () => {
      const initialMonitors = await provider.listMonitors();
      const newMonitor: NewMonitor = {
        name: "New Test Monitor",
        url: "https://newtest.example.com",
        method: "HEAD",
        interval_minutes: 10,
      };

      const created = await provider.createMonitor(newMonitor);

      expect(created.id).toBeDefined();
      expect(created.name).toBe(newMonitor.name);
      expect(created.url).toBe(newMonitor.url);
      expect(created.method).toBe(newMonitor.method);
      expect(created.interval_minutes).toBe(newMonitor.interval_minutes);
      expect(created.active).toBe(true);
      expect(created.created_at).toBeDefined();

      const allMonitors = await provider.listMonitors();
      expect(allMonitors.length).toBe(initialMonitors.length + 1);
      expect(allMonitors.some((m) => m.id === created.id)).toBe(true);
    });

    it("new monitor is active by default", async () => {
      const newMonitor: NewMonitor = {
        name: "Active Test",
        url: "https://active.example.com",
        method: "GET",
        interval_minutes: 5,
      };

      const created = await provider.createMonitor(newMonitor);
      const retrieved = await provider.getMonitor(created.id);

      expect(retrieved?.active).toBe(true);
    });
  });

  describe("deleteMonitor", () => {
    it("removes monitor from listMonitors", async () => {
      const initial = await provider.listMonitors();
      const toDelete = initial[0];

      await provider.deleteMonitor(toDelete.id);

      const after = await provider.listMonitors();
      expect(after.length).toBe(initial.length - 1);
      expect(after.some((m) => m.id === toDelete.id)).toBe(false);
    });

    it("also removes associated checks", async () => {
      const monitors = await provider.listMonitors();
      const toDelete = monitors[0];

      const beforeChecks = await provider.listMonitorsWithChecks(24);
      const checksForMonitor = beforeChecks.find(
        (m) => m.id === toDelete.id
      );
      const checkCountBefore =
        checksForMonitor?.checks.length || 0;

      expect(checkCountBefore).toBeGreaterThan(0);

      await provider.deleteMonitor(toDelete.id);

      const afterChecks = await provider.listMonitorsWithChecks(24);
      const stillExist = afterChecks.find((m) => m.id === toDelete.id);

      if (stillExist) {
        expect(stillExist.checks.length).toBe(0);
      }
    });
  });

  describe("setMonitorActive", () => {
    it("toggles monitor active status", async () => {
      const monitors = await provider.listMonitors();
      const monitor = monitors[0];

      await provider.setMonitorActive(monitor.id, false);
      let retrieved = await provider.getMonitor(monitor.id);
      expect(retrieved?.active).toBe(false);

      await provider.setMonitorActive(monitor.id, true);
      retrieved = await provider.getMonitor(monitor.id);
      expect(retrieved?.active).toBe(true);
    });
  });

  describe("recordChecks", () => {
    it("appends checks to store", async () => {
      const monitors = await provider.listMonitors();
      const monitor = monitors[0];

      const checksBeforeRecord = await provider.listMonitorsWithChecks(24);
      const countBefore =
        checksBeforeRecord.find((m) => m.id === monitor.id)?.checks.length || 0;

      const now = new Date();
      const newChecks = [
        {
          monitor_id: monitor.id,
          checked_at: now.toISOString(),
          ok: true,
          status_code: 200,
          latency_ms: 50,
          error: null,
        },
        {
          monitor_id: monitor.id,
          checked_at: new Date(now.getTime() + 1000).toISOString(),
          ok: false,
          status_code: 503,
          latency_ms: null,
          error: "Service Unavailable",
        },
      ];

      await provider.recordChecks(newChecks);

      // Use a larger window to ensure new checks are captured
      const checksAfterRecord = await provider.listMonitorsWithChecks(25);
      const countAfter =
        checksAfterRecord.find((m) => m.id === monitor.id)?.checks.length || 0;

      expect(countAfter).toBeGreaterThanOrEqual(countBefore + 2);
    });
  });

  describe("listMonitorsWithChecks", () => {
    it("returns monitors with checks sorted oldest to newest", async () => {
      const monitorsWithChecks = await provider.listMonitorsWithChecks(24);
      const monitor = monitorsWithChecks[0];

      const checks = monitor.checks;
      if (checks.length > 1) {
        for (let i = 0; i < checks.length - 1; i++) {
          const current = new Date(checks[i].checked_at).getTime();
          const next = new Date(checks[i + 1].checked_at).getTime();
          expect(current).toBeLessThanOrEqual(next);
        }
      }
    });

    it("filters checks within the specified time window", async () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const monitorsWithChecks = await provider.listMonitorsWithChecks(24);
      const monitor = monitorsWithChecks[0];

      monitor.checks.forEach((check) => {
        const checkTime = new Date(check.checked_at).getTime();
        expect(checkTime).toBeGreaterThanOrEqual(oneDayAgo);
        expect(checkTime).toBeLessThanOrEqual(now + 60 * 1000); // Allow 1 min buffer
      });
    });

    it("returns only monitors with checks in the window", async () => {
      const monitorsWithChecks = await provider.listMonitorsWithChecks(24);

      // At least the seeded monitors should have 24h of checks
      expect(monitorsWithChecks.length).toBeGreaterThan(0);
    });
  });

  describe("getMonitor", () => {
    it("returns monitor by id", async () => {
      const monitors = await provider.listMonitors();
      const expected = monitors[0];

      const retrieved = await provider.getMonitor(expected.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(expected.id);
      expect(retrieved?.name).toBe(expected.name);
    });

    it("returns null for unknown id", async () => {
      const retrieved = await provider.getMonitor("unknown-id-12345");

      expect(retrieved).toBeNull();
    });
  });

  describe("store isolation between tests", () => {
    it("each test gets a fresh store via vi.resetModules", async () => {
      const monitors1 = await provider.listMonitors();
      const count1 = monitors1.length;

      // Create a new provider in a new test context
      vi.resetModules();
      const { createDemoProvider: createDemoProvider2 } = await import(
        "@/lib/data/demo"
      );
      const provider2 = createDemoProvider2();
      const monitors2 = await provider2.listMonitors();
      const count2 = monitors2.length;

      // Both should have the same initial count (seeded monitors)
      expect(count1).toBe(count2);
    });
  });
});
