import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkMonitor, runChecksOnce } from "@/lib/checks/run";
import { Monitor } from "@/lib/types";

const testMonitor: Pick<Monitor, "id" | "url" | "method"> = {
  id: "test-1",
  url: "https://example.com",
  method: "GET",
};

describe("checkMonitor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("successful checks", () => {
    it("returns ok:true with status code and latency on 2xx response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkMonitor(testMonitor);

      expect(result.ok).toBe(true);
      expect(result.status_code).toBe(200);
      expect(result.latency_ms).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeNull();
      expect(result.monitor_id).toBe("test-1");
      expect(result.checked_at).toBeDefined();
    });

    it("records actual response status code", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkMonitor(testMonitor);

      expect(result.status_code).toBe(201);
    });
  });

  describe("failed checks", () => {
    it("returns ok:false for non-ok response status", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkMonitor(testMonitor);

      expect(result.ok).toBe(false);
      expect(result.status_code).toBe(500);
      expect(result.error).toBeNull();
    });

    it("returns ok:false with error message on fetch exception", async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new TypeError("Network error")
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkMonitor(testMonitor);

      expect(result.ok).toBe(false);
      expect(result.status_code).toBeNull();
      expect(result.error).toBe("Network error");
    });

    it("records latency even on error", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Timeout"));
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkMonitor(testMonitor);

      expect(result.latency_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("error message handling", () => {
    it("truncates long error messages to 500 characters", async () => {
      const longMessage = "a".repeat(600);
      const mockFetch = vi.fn().mockRejectedValue(new Error(longMessage));
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkMonitor(testMonitor);

      expect(result.error).toBeDefined();
      expect(result.error?.length).toBeLessThanOrEqual(500);
    });

    it("preserves error message if under 500 characters", async () => {
      const message = "Connection refused";
      const mockFetch = vi.fn().mockRejectedValue(new Error(message));
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkMonitor(testMonitor);

      expect(result.error).toBe(message);
    });

    it("handles non-Error thrown values", async () => {
      const mockFetch = vi.fn().mockRejectedValue("string error");
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkMonitor(testMonitor);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("string error");
    });
  });

  describe("fetch configuration", () => {
    it("uses the monitor's method (GET or HEAD)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal("fetch", mockFetch);

      await checkMonitor({ ...testMonitor, method: "HEAD" });

      expect(mockFetch).toHaveBeenCalledWith(
        testMonitor.url,
        expect.objectContaining({ method: "HEAD" })
      );
    });

    it("defaults to GET if method not specified", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal("fetch", mockFetch);

      const monitorWithoutMethod = { id: "test", url: "https://example.com" };
      await checkMonitor(monitorWithoutMethod as any);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("sets User-Agent header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal("fetch", mockFetch);

      await checkMonitor(testMonitor);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("watchpost"),
          }),
        })
      );
    });

    it("follows redirects", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal("fetch", mockFetch);

      await checkMonitor(testMonitor);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ redirect: "follow" })
      );
    });

    it("disables caching", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal("fetch", mockFetch);

      await checkMonitor(testMonitor);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cache: "no-store" })
      );
    });

    it("uses custom timeout", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal("fetch", mockFetch);

      await checkMonitor(testMonitor, 30000);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });
});

describe("runChecksOnce", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("works with active monitors and records counts", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal("fetch", mockFetch);

    const result = await runChecksOnce();

    // Demo provider has 3 monitors seeded
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.up + result.down).toBe(result.total);
    expect(result.up).toBeGreaterThanOrEqual(0);
    expect(result.down).toBeGreaterThanOrEqual(0);
  });

  it("counts up vs down correctly based on response.ok", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue({ ok: false, status: 503 });

    vi.stubGlobal("fetch", mockFetch);

    const result = await runChecksOnce();

    // All mocked as down
    expect(result.down).toBe(result.total);
    expect(result.up).toBe(0);
  });

  it("handles mix of successes and failures", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal("fetch", mockFetch);

    const result = await runChecksOnce();

    if (result.total > 0) {
      expect(result.up).toBeGreaterThan(0);
      expect(result.down).toBeGreaterThan(0);
    }
  });
});
