import { describe, it, expect, beforeEach } from "vitest";
import {
  summarizeMonitor,
  overallStatus,
  MonitorSummary,
} from "@/lib/status";
import { Monitor, MonitorWithChecks, Check } from "@/lib/types";

const fixedNow = new Date("2024-01-15T12:00:00Z");

function createMonitor(overrides?: Partial<Monitor>): Monitor {
  return {
    id: "test-monitor-1",
    name: "Test Monitor",
    url: "https://example.com",
    method: "GET",
    interval_minutes: 5,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function createCheck(overrides?: Partial<Check>): Check {
  return {
    id: 1,
    monitor_id: "test-monitor-1",
    checked_at: fixedNow.toISOString(),
    ok: true,
    status_code: 200,
    latency_ms: 100,
    error: null,
    ...overrides,
  };
}

function createMonitorWithChecks(
  checks: Check[],
  overrides?: Partial<Monitor>
): MonitorWithChecks {
  return {
    ...createMonitor(overrides),
    checks,
  };
}

describe("summarizeMonitor", () => {
  describe("status determination", () => {
    it("returns 'unknown' status when no checks exist", () => {
      const monitor = createMonitorWithChecks([]);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.status).toBe("unknown");
      expect(summary.lastCheck).toBeNull();
      expect(summary.uptime24h).toBeNull();
      expect(summary.avgLatencyMs).toBeNull();
      expect(summary.lastError).toBeNull();
    });

    it("returns 'up' status when last check is ok", () => {
      const checks = [
        createCheck({ checked_at: fixedNow.toISOString(), ok: true }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.status).toBe("up");
      expect(summary.lastCheck).toEqual(checks[0]);
    });

    it("returns 'down' status when last check failed", () => {
      const checks = [
        createCheck({ checked_at: fixedNow.toISOString(), ok: false }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.status).toBe("down");
    });

    it("returns 'degraded' when last check ok but 20%+ of last hour checks failed", () => {
      const oneHourAgo = new Date(fixedNow.getTime() - 60 * 60 * 1000);
      const checks = [
        // Last hour: 5 checks, 2 failed = 40%
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 0).toISOString(),
          ok: false,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 15 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 30 * 60 * 1000).toISOString(),
          ok: false,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 45 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 59 * 60 * 1000).toISOString(),
          ok: true,
        }),
        // Old check
        createCheck({
          checked_at: new Date(
            oneHourAgo.getTime() - 1 * 60 * 60 * 1000
          ).toISOString(),
          ok: true,
        }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.status).toBe("degraded");
    });

    it("returns 'degraded' when exactly 20% of last hour checks failed", () => {
      const oneHourAgo = new Date(fixedNow.getTime() - 60 * 60 * 1000);
      const checks = [
        // Last hour: 5 checks, 1 failed = 20% (at threshold)
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 0).toISOString(),
          ok: false,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 15 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 30 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 45 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 59 * 60 * 1000).toISOString(),
          ok: true,
        }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.status).toBe("degraded");
    });

    it("returns 'up' when last check ok and less than 20% of last hour checks failed", () => {
      const oneHourAgo = new Date(fixedNow.getTime() - 60 * 60 * 1000);
      const checks = [
        // Last hour: 6 checks, 1 failed = 16.67% < 20%
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 0).toISOString(),
          ok: false,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 10 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 20 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 30 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 40 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(oneHourAgo.getTime() + 50 * 60 * 1000).toISOString(),
          ok: true,
        }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.status).toBe("up");
    });
  });

  describe("uptime24h calculation", () => {
    it("calculates correct uptime percentage", () => {
      const checks = [
        createCheck({ ok: true }),
        createCheck({ ok: true }),
        createCheck({ ok: false }),
        createCheck({ ok: true }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.uptime24h).toBe(0.75);
    });

    it("rounds uptime to 2 decimal places", () => {
      const checks = Array(100)
        .fill(null)
        .map((_, i) => createCheck({ ok: i < 66 }));
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.uptime24h).toBe(0.66);
    });

    it("returns null uptime when no checks", () => {
      const monitor = createMonitorWithChecks([]);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.uptime24h).toBeNull();
    });

    it("returns 1 when all checks ok", () => {
      const checks = [
        createCheck({ ok: true }),
        createCheck({ ok: true }),
        createCheck({ ok: true }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.uptime24h).toBe(1);
    });

    it("returns 0 when all checks failed", () => {
      const checks = [
        createCheck({ ok: false }),
        createCheck({ ok: false }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.uptime24h).toBe(0);
    });
  });

  describe("avgLatencyMs calculation", () => {
    it("calculates average latency over ok checks only", () => {
      const checks = [
        createCheck({ ok: true, latency_ms: 100 }),
        createCheck({ ok: false, latency_ms: null }),
        createCheck({ ok: true, latency_ms: 200 }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.avgLatencyMs).toBe(150);
    });

    it("returns null when no ok checks with latency", () => {
      const checks = [createCheck({ ok: false, latency_ms: null })];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.avgLatencyMs).toBeNull();
    });

    it("rounds average latency to nearest integer", () => {
      const checks = [
        createCheck({ ok: true, latency_ms: 100 }),
        createCheck({ ok: true, latency_ms: 101 }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.avgLatencyMs).toBe(101); // 100.5 rounds to 101
    });

    it("returns null when all checks failed", () => {
      const checks = [
        createCheck({ ok: false }),
        createCheck({ ok: false }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.avgLatencyMs).toBeNull();
    });
  });

  describe("lastError determination", () => {
    it("returns most recent error from failed checks", () => {
      const checks = [
        createCheck({
          checked_at: new Date(fixedNow.getTime() - 1000).toISOString(),
          ok: false,
          error: "Old error",
        }),
        createCheck({
          checked_at: fixedNow.toISOString(),
          ok: true,
          error: null,
        }),
        createCheck({
          checked_at: new Date(fixedNow.getTime() + 1000).toISOString(),
          ok: false,
          error: "Recent error",
        }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.lastError).toBe("Recent error");
    });

    it("returns null when no failed checks have errors", () => {
      const checks = [
        createCheck({ ok: true, error: null }),
        createCheck({ ok: false, error: null }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.lastError).toBeNull();
    });

    it("returns null when no checks failed", () => {
      const checks = [createCheck({ ok: true, error: null })];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.lastError).toBeNull();
    });
  });

  describe("bucket assignment", () => {
    it("returns exactly 48 buckets", () => {
      const checks = [createCheck()];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.buckets.length).toBe(48);
    });

    it("marks empty buckets when no checks fall in them", () => {
      const checks = [
        createCheck({
          checked_at: new Date(fixedNow.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          ok: true,
        }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.buckets.some((b) => b === "empty")).toBe(true);
    });

    it("marks bucket as 'down' when >50% of checks failed", () => {
      const bucketStart = fixedNow.getTime() - 30 * 60 * 1000;
      const checks = [
        createCheck({
          checked_at: new Date(bucketStart + 0).toISOString(),
          ok: false,
        }),
        createCheck({
          checked_at: new Date(bucketStart + 10 * 60 * 1000).toISOString(),
          ok: false,
        }),
        createCheck({
          checked_at: new Date(bucketStart + 20 * 60 * 1000).toISOString(),
          ok: true,
        }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      // Should have at least one 'down' bucket
      expect(summary.buckets.some((b) => b === "down")).toBe(true);
    });

    it("marks bucket as 'degraded' when 0% < failures <= 50%", () => {
      const bucketStart = fixedNow.getTime() - 30 * 60 * 1000;
      const checks = [
        createCheck({
          checked_at: new Date(bucketStart + 0).toISOString(),
          ok: false,
        }),
        createCheck({
          checked_at: new Date(bucketStart + 15 * 60 * 1000).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(bucketStart + 29 * 60 * 1000).toISOString(),
          ok: true,
        }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.buckets.some((b) => b === "degraded")).toBe(true);
    });

    it("marks bucket as 'up' when 0% failures", () => {
      const bucketStart = fixedNow.getTime() - 30 * 60 * 1000;
      const checks = [
        createCheck({
          checked_at: new Date(bucketStart + 0).toISOString(),
          ok: true,
        }),
        createCheck({
          checked_at: new Date(bucketStart + 15 * 60 * 1000).toISOString(),
          ok: true,
        }),
      ];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.buckets.some((b) => b === "up")).toBe(true);
    });

    it("buckets cover full 24 hours with oldest first", () => {
      const checks: Check[] = [];
      for (let i = 0; i < 48; i++) {
        const bucketTime = fixedNow.getTime() - ((47 - i) * 30 + 15) * 60 * 1000;
        checks.push(
          createCheck({
            id: i,
            checked_at: new Date(bucketTime).toISOString(),
            ok: i % 2 === 0,
          })
        );
      }
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor, fixedNow);

      expect(summary.buckets.length).toBe(48);
      // All buckets should be assigned
      expect(summary.buckets.every((b) => b !== undefined)).toBe(true);
    });
  });

  describe("default now parameter", () => {
    it("uses current date when now is not provided", () => {
      const checks = [createCheck({ ok: true })];
      const monitor = createMonitorWithChecks(checks);
      const summary = summarizeMonitor(monitor);

      expect(summary.monitor).toEqual(monitor);
      expect(summary.buckets.length).toBe(48);
    });
  });
});

describe("overallStatus", () => {
  function createSummary(
    status: "up" | "down" | "degraded" | "unknown"
  ): MonitorSummary {
    return {
      monitor: createMonitor(),
      status,
      uptime24h: 1,
      avgLatencyMs: 100,
      lastCheck: createCheck(),
      lastError: null,
      buckets: Array(48).fill("up"),
    };
  }

  it("returns 'unknown' when no summaries provided", () => {
    const result = overallStatus([]);
    expect(result).toBe("unknown");
  });

  it("returns 'unknown' when all summaries are unknown", () => {
    const summaries = [
      createSummary("unknown"),
      createSummary("unknown"),
    ];
    const result = overallStatus(summaries);
    expect(result).toBe("unknown");
  });

  it("returns 'outage' when any monitor is down", () => {
    const summaries = [
      createSummary("up"),
      createSummary("down"),
      createSummary("degraded"),
    ];
    const result = overallStatus(summaries);
    expect(result).toBe("outage");
  });

  it("returns 'degraded' when any monitor is degraded but none are down", () => {
    const summaries = [
      createSummary("up"),
      createSummary("degraded"),
      createSummary("up"),
    ];
    const result = overallStatus(summaries);
    expect(result).toBe("degraded");
  });

  it("returns 'operational' when all are up", () => {
    const summaries = [
      createSummary("up"),
      createSummary("up"),
      createSummary("up"),
    ];
    const result = overallStatus(summaries);
    expect(result).toBe("operational");
  });

  it("returns 'operational' when all are up or unknown", () => {
    const summaries = [
      createSummary("up"),
      createSummary("unknown"),
      createSummary("up"),
    ];
    const result = overallStatus(summaries);
    expect(result).toBe("operational");
  });

  it("returns 'degraded' when mix of degraded, up, and unknown", () => {
    const summaries = [
      createSummary("degraded"),
      createSummary("unknown"),
      createSummary("up"),
    ];
    const result = overallStatus(summaries);
    expect(result).toBe("degraded");
  });

  it("prioritizes outage over degraded", () => {
    const summaries = [
      createSummary("down"),
      createSummary("degraded"),
      createSummary("up"),
    ];
    const result = overallStatus(summaries);
    expect(result).toBe("outage");
  });

  it("handles single monitor", () => {
    const summaries = [createSummary("degraded")];
    const result = overallStatus(summaries);
    expect(result).toBe("degraded");
  });
});
