import { Check, Monitor, MonitorWithChecks } from "./types";

export type MonitorStatus = "up" | "down" | "degraded" | "unknown";
export type BucketStatus = "up" | "down" | "degraded" | "empty";

export interface MonitorSummary {
  monitor: Monitor;
  status: MonitorStatus;
  uptime24h: number | null;
  avgLatencyMs: number | null;
  lastCheck: Check | null;
  lastError: string | null;
  buckets: BucketStatus[];
}

/**
 * Summarizes a monitor with its checks over the last 24 hours.
 * Returns status, uptime percentage, average latency, last error, and 48 half-hour buckets.
 */
export function summarizeMonitor(
  m: MonitorWithChecks,
  now: Date = new Date()
): MonitorSummary {
  const checks = m.checks;

  // Determine status
  let status: MonitorStatus = "unknown";
  let lastCheck: Check | null = null;

  if (checks.length > 0) {
    lastCheck = checks[checks.length - 1];
    const lastOk = lastCheck.ok;

    if (!lastOk) {
      status = "down";
    } else {
      // Last check is ok. Check if ≥20% of checks in last hour failed.
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const lastHourChecks = checks.filter((c) => {
        return new Date(c.checked_at) >= oneHourAgo;
      });

      if (lastHourChecks.length > 0) {
        const failedCount = lastHourChecks.filter((c) => !c.ok).length;
        const failureRate = failedCount / lastHourChecks.length;
        status = failureRate >= 0.2 ? "degraded" : "up";
      } else {
        status = "up";
      }
    }
  }

  // Calculate uptime24h
  let uptime24h: number | null = null;
  if (checks.length > 0) {
    const okCount = checks.filter((c) => c.ok).length;
    uptime24h = Math.round((okCount / checks.length) * 10000) / 10000; // 4 decimals, then round to 2
    uptime24h = Math.round(uptime24h * 100) / 100;
  }

  // Calculate avgLatencyMs
  let avgLatencyMs: number | null = null;
  const okChecks = checks.filter((c) => c.ok && c.latency_ms !== null);
  if (okChecks.length > 0) {
    const sum = okChecks.reduce((acc, c) => acc + (c.latency_ms || 0), 0);
    avgLatencyMs = Math.round(sum / okChecks.length);
  }

  // Get lastError
  let lastError: string | null = null;
  for (let i = checks.length - 1; i >= 0; i--) {
    if (!checks[i].ok && checks[i].error) {
      lastError = checks[i].error;
      break;
    }
  }

  // Build 48 half-hour buckets for last 24h
  const buckets: BucketStatus[] = [];
  const bucketSize = 30 * 60 * 1000; // 30 minutes in milliseconds
  const totalBuckets = 48;

  for (let i = 0; i < totalBuckets; i++) {
    // Calculate bucket start and end (oldest first)
    const bucketEnd = now.getTime() - (totalBuckets - 1 - i) * bucketSize;
    const bucketStart = bucketEnd - bucketSize;

    // Find checks in this bucket
    const bucketChecks = checks.filter((c) => {
      const checkTime = new Date(c.checked_at).getTime();
      return checkTime >= bucketStart && checkTime < bucketEnd;
    });

    if (bucketChecks.length === 0) {
      buckets.push("empty");
    } else {
      const failedCount = bucketChecks.filter((c) => !c.ok).length;
      const failureRate = failedCount / bucketChecks.length;

      if (failureRate > 0.5) {
        buckets.push("down");
      } else if (failureRate > 0) {
        buckets.push("degraded");
      } else {
        buckets.push("up");
      }
    }
  }

  return {
    monitor: m,
    status,
    uptime24h,
    avgLatencyMs,
    lastCheck,
    lastError,
    buckets,
  };
}

/**
 * Determines the overall status across all monitors.
 */
export function overallStatus(
  summaries: MonitorSummary[]
): "operational" | "degraded" | "outage" | "unknown" {
  if (summaries.length === 0) {
    return "unknown";
  }

  const allUnknown = summaries.every((s) => s.status === "unknown");
  if (allUnknown) {
    return "unknown";
  }

  const hasDown = summaries.some((s) => s.status === "down");
  if (hasDown) {
    return "outage";
  }

  const hasDegraded = summaries.some((s) => s.status === "degraded");
  if (hasDegraded) {
    return "degraded";
  }

  return "operational";
}
