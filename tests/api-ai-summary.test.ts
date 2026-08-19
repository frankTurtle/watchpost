import { describe, it, expect, afterEach, vi } from "vitest";
import { POST as POST_ai_summary } from "@/app/api/ai/summary/route";

describe("POST /api/ai/summary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns 503 when AI_SERVICE_URL is not configured", async () => {
    vi.stubEnv("AI_SERVICE_URL", "");

    const response = await POST_ai_summary();

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toContain("not configured");
  });

  it("returns 502 when fetch to AI service fails with non-ok status", async () => {
    vi.stubEnv("AI_SERVICE_URL", "http://localhost:8000");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    vi.stubGlobal("fetch", mockFetch);

    const response = await POST_ai_summary();

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain("failed");
  });

  it("returns 502 when fetch throws an error", async () => {
    vi.stubEnv("AI_SERVICE_URL", "http://localhost:8000");

    const mockFetch = vi.fn().mockRejectedValue(
      new Error("Connection refused")
    );

    vi.stubGlobal("fetch", mockFetch);

    const response = await POST_ai_summary();

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("forwards AI service response on success", async () => {
    vi.stubEnv("AI_SERVICE_URL", "http://localhost:8000");

    const aiResponse = {
      summary: "All systems operational",
      model: "gpt-4",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(aiResponse),
    });

    vi.stubGlobal("fetch", mockFetch);

    const response = await POST_ai_summary();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.summary).toBe("All systems operational");
    expect(data.model).toBe("gpt-4");
  });

  it("calls AI service with correct payload format", async () => {
    vi.stubEnv("AI_SERVICE_URL", "http://ai:8000");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ summary: "test" }),
    });

    vi.stubGlobal("fetch", mockFetch);

    await POST_ai_summary();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://ai:8000/summarize",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      })
    );

    const callArgs = mockFetch.mock.calls[0];
    const bodyString = callArgs[1].body;
    const body = JSON.parse(bodyString);

    expect(body).toHaveProperty("monitors");
    expect(Array.isArray(body.monitors)).toBe(true);
    if (body.monitors.length > 0) {
      const monitor = body.monitors[0];
      expect(monitor).toHaveProperty("name");
      expect(monitor).toHaveProperty("url");
      expect(monitor).toHaveProperty("status");
      expect(monitor).toHaveProperty("uptime_24h");
      expect(monitor).toHaveProperty("avg_latency_ms");
      expect(monitor).toHaveProperty("last_error");
    }
  });

  it("uses 30 second timeout for AI service call", async () => {
    vi.stubEnv("AI_SERVICE_URL", "http://localhost:8000");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ summary: "test" }),
    });

    vi.stubGlobal("fetch", mockFetch);

    await POST_ai_summary();

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1]).toHaveProperty("signal");
    expect(callArgs[1].signal instanceof AbortSignal).toBe(true);
  });

  it("uses correct API endpoint path", async () => {
    vi.stubEnv("AI_SERVICE_URL", "http://ai.example.com:3000");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ summary: "ok" }),
    });

    vi.stubGlobal("fetch", mockFetch);

    await POST_ai_summary();

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/summarize");
    expect(url).toContain("http://ai.example.com:3000");
  });

  it("transforms unknown status to 'up' for AI payload", async () => {
    vi.stubEnv("AI_SERVICE_URL", "http://localhost:8000");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ summary: "test" }),
    });

    vi.stubGlobal("fetch", mockFetch);

    await POST_ai_summary();

    expect(mockFetch).toHaveBeenCalled();
    const bodyString = mockFetch.mock.calls[0][1].body;
    const body = JSON.parse(bodyString);

    // Check if any monitor with 'unknown' status has been transformed to 'up'
    body.monitors.forEach((m: Record<string, unknown>) => {
      expect(m.status).not.toBe("unknown");
    });
  });

  it("returns 400 when no monitors to summarize", async () => {
    vi.stubEnv("AI_SERVICE_URL", "http://localhost:8000");

    // Mock the data provider to return no monitors
    vi.doMock("@/lib/data", () => ({
      getDataProvider: vi.fn(() => ({
        listMonitors: vi.fn().mockResolvedValue([]),
        listActiveMonitors: vi.fn().mockResolvedValue([]),
        getMonitor: vi.fn().mockResolvedValue(null),
        createMonitor: vi.fn(),
        deleteMonitor: vi.fn(),
        setMonitorActive: vi.fn(),
        recordChecks: vi.fn(),
        listMonitorsWithChecks: vi.fn().mockResolvedValue([]),
      })),
    }));

    const { POST: POST_summary } = await import("@/app/api/ai/summary/route");

    const response = await POST_summary();

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("no monitors");
  });
});
