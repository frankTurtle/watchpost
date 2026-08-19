import { getDataProvider } from "@/lib/data";
import { summarizeMonitor } from "@/lib/status";

export async function POST() {
  const aiServiceUrl = process.env.AI_SERVICE_URL;

  if (!aiServiceUrl) {
    return Response.json(
      { error: "AI service not configured" },
      { status: 503 }
    );
  }

  try {
    const provider = getDataProvider();
    const monitorsWithChecks = await provider.listMonitorsWithChecks(24);

    if (monitorsWithChecks.length === 0) {
      return Response.json(
        { error: "no monitors to summarize" },
        { status: 400 }
      );
    }

    const summaries = monitorsWithChecks.map((m) => summarizeMonitor(m));

    const aiPayload = {
      monitors: summaries.map((s) => ({
        name: s.monitor.name,
        url: s.monitor.url,
        status: s.status === "unknown" ? "up" : s.status,
        uptime_24h: s.uptime24h ?? 100,
        avg_latency_ms: s.avgLatencyMs ?? 0,
        last_error: s.lastError,
      })),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(`${aiServiceUrl}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return Response.json(
        { error: "AI summary failed" },
        { status: 502 }
      );
    }

    const result = await response.json();
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "AI summary failed" },
      { status: 502 }
    );
  }
}
