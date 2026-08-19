import { Monitor, CheckResult } from "@/lib/types";
import { getDataProvider } from "@/lib/data";

export async function checkMonitor(
  monitor: Pick<Monitor, "id" | "url" | "method">,
  timeoutMs = 10_000
): Promise<CheckResult> {
  const checked_at = new Date().toISOString();
  const startTime = performance.now();

  try {
    const response = await fetch(monitor.url, {
      method: monitor.method || "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "watchpost-checker/1.0",
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

    const latency_ms = Math.round(performance.now() - startTime);

    return {
      monitor_id: monitor.id,
      checked_at,
      ok: response.ok,
      status_code: response.status,
      latency_ms,
      error: null,
    };
  } catch (err) {
    const latency_ms = Math.round(performance.now() - startTime);
    const errorMessage = String(
      err instanceof Error ? err.message : err
    ).slice(0, 500);

    return {
      monitor_id: monitor.id,
      checked_at,
      ok: false,
      status_code: null,
      latency_ms,
      error: errorMessage,
    };
  }
}

export async function runChecksOnce(): Promise<{
  total: number;
  up: number;
  down: number;
}> {
  const provider = getDataProvider();
  const monitors = await provider.listActiveMonitors();

  if (monitors.length === 0) {
    return { total: 0, up: 0, down: 0 };
  }

  const results = await Promise.all(monitors.map((monitor) => checkMonitor(monitor)));

  await provider.recordChecks(results);

  const up = results.filter((r) => r.ok).length;
  const down = results.length - up;

  return {
    total: results.length,
    up,
    down,
  };
}
