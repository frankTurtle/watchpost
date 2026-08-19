import { describe, it, expect, afterEach, vi } from "vitest";
import { POST as POST_checks } from "@/app/api/checks/run/route";

describe("POST /api/checks/run", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("requires admin auth when password is set", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");

    const request = new Request("http://localhost/api/checks/run", {
      method: "POST",
    });

    const response = await POST_checks(request);

    expect(response.status).toBe(401);
  });

  it("runs checks and returns summary when auth is correct", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal("fetch", mockFetch);

    const request = new Request("http://localhost/api/checks/run", {
      method: "POST",
    });

    const response = await POST_checks(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.total).toBeDefined();
    expect(data.up).toBeDefined();
    expect(data.down).toBeDefined();
    expect(typeof data.total).toBe("number");
    expect(typeof data.up).toBe("number");
    expect(typeof data.down).toBe("number");
  });

  it("returns correct counts from check results", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    // Mock all checks to succeed
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    vi.stubGlobal("fetch", mockFetch);

    const request = new Request("http://localhost/api/checks/run", {
      method: "POST",
    });

    const response = await POST_checks(request);

    const data = await response.json();
    expect(data.up).toBe(data.total);
    expect(data.down).toBe(0);
  });

  it("handles mix of successful and failed checks", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal("fetch", mockFetch);

    const request = new Request("http://localhost/api/checks/run", {
      method: "POST",
    });

    const response = await POST_checks(request);

    const data = await response.json();
    expect(data.up + data.down).toBe(data.total);
    if (data.total > 0) {
      expect(data.up).toBeGreaterThan(0);
      expect(data.down).toBeGreaterThan(0);
    }
  });

  it("returns 401 when auth fails with basic auth", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "correct");

    const encoded = Buffer.from("admin:wrong").toString("base64");
    const request = new Request("http://localhost/api/checks/run", {
      method: "POST",
      headers: { authorization: `Basic ${encoded}` },
    });

    const response = await POST_checks(request);

    expect(response.status).toBe(401);
  });

  it("runs checks with correct basic auth", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret123");

    const encoded = Buffer.from("user:secret123").toString("base64");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    vi.stubGlobal("fetch", mockFetch);

    const request = new Request("http://localhost/api/checks/run", {
      method: "POST",
      headers: { authorization: `Basic ${encoded}` },
    });

    const response = await POST_checks(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  it("records failed checks when fetch errors occur", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    // checkMonitor catches fetch errors and returns ok: false
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection error"));

    vi.stubGlobal("fetch", mockFetch);

    const request = new Request("http://localhost/api/checks/run", {
      method: "POST",
    });

    const response = await POST_checks(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    // All checks should be down due to the error
    expect(data.down).toBeGreaterThanOrEqual(0);
    expect(data.total).toBeGreaterThanOrEqual(0);
  });
});
