import { describe, it, expect, afterEach, vi } from "vitest";
import { GET as GET_monitors, POST as POST_monitors } from "@/app/api/monitors/route";
import {
  DELETE as DELETE_monitor,
  PATCH as PATCH_monitor,
} from "@/app/api/monitors/[id]/route";

describe("POST /api/monitors", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates monitor and returns 201 when body is valid", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const request = new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Monitor",
        url: "https://example.com",
      }),
    });

    const response = await POST_monitors(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.monitor).toBeDefined();
    expect(data.monitor.name).toBe("Test Monitor");
    expect(data.monitor.url).toBe("https://example.com");
    expect(data.monitor.id).toBeDefined();
    expect(data.monitor.active).toBe(true);
  });

  it("returns 400 with error message when body is invalid", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const request = new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "", // invalid
        url: "https://example.com",
      }),
    });

    const response = await POST_monitors(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("name");
  });

  it("returns 400 when request body is not valid JSON", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const request = new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST_monitors(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("JSON");
  });

  it("requires auth when ADMIN_PASSWORD is set", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");

    const request = new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        url: "https://example.com",
      }),
    });

    const response = await POST_monitors(request);

    expect(response.status).toBe(401);
  });

  it("creates monitor with correct auth", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret123");

    const encoded = Buffer.from("admin:secret123").toString("base64");
    const request = new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Basic ${encoded}`,
      },
      body: JSON.stringify({
        name: "Secured Monitor",
        url: "https://example.com",
      }),
    });

    const response = await POST_monitors(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.monitor.name).toBe("Secured Monitor");
  });
});

describe("GET /api/monitors", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("returns list of monitors", async () => {
    const response = await GET_monitors();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.monitors).toBeDefined();
    expect(Array.isArray(data.monitors)).toBe(true);
  });

  it("returns seeded monitors", async () => {
    const response = await GET_monitors();

    const data = await response.json();
    // Demo provider seeds 3 monitors
    expect(data.monitors.length).toBeGreaterThanOrEqual(1);

    const first = data.monitors[0];
    expect(first.id).toBeDefined();
    expect(first.name).toBeDefined();
    expect(first.url).toBeDefined();
  });
});

describe("DELETE /api/monitors/[id]", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("requires auth when password is set", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");

    const request = new Request("http://localhost/api/monitors/123", {
      method: "DELETE",
    });

    const response = await DELETE_monitor(request, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(401);
  });

  it("deletes monitor when auth is correct", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    // First, create a monitor
    const createRequest = new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "To Delete",
        url: "https://example.com",
      }),
    });

    const createResponse = await POST_monitors(createRequest);
    const { monitor } = await createResponse.json();

    // Then delete it
    const deleteRequest = new Request(
      `http://localhost/api/monitors/${monitor.id}`,
      { method: "DELETE" }
    );

    const deleteResponse = await DELETE_monitor(deleteRequest, {
      params: Promise.resolve({ id: monitor.id }),
    });

    expect(deleteResponse.status).toBe(204);
  });

  it("returns 204 even for unknown id", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const request = new Request("http://localhost/api/monitors/unknown", {
      method: "DELETE",
    });

    const response = await DELETE_monitor(request, {
      params: Promise.resolve({ id: "unknown-id-xyz" }),
    });

    expect(response.status).toBe(204);
  });
});

describe("PATCH /api/monitors/[id]", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("requires auth when password is set", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");

    const request = new Request("http://localhost/api/monitors/123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });

    const response = await PATCH_monitor(request, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(401);
  });

  it("toggles monitor active status", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    // Create a monitor
    const createRequest = new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Toggle Test",
        url: "https://example.com",
      }),
    });

    const createResponse = await POST_monitors(createRequest);
    const { monitor } = await createResponse.json();

    // PATCH to deactivate
    const patchRequest = new Request(
      `http://localhost/api/monitors/${monitor.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      }
    );

    const patchResponse = await PATCH_monitor(patchRequest, {
      params: Promise.resolve({ id: monitor.id }),
    });

    expect(patchResponse.status).toBe(200);
    const data = await patchResponse.json();
    expect(data.ok).toBe(true);
  });

  it("returns 400 when active is not boolean", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const request = new Request("http://localhost/api/monitors/123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: "true" }), // string, not boolean
    });

    const response = await PATCH_monitor(request, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("boolean");
  });

  it("returns 400 when body is not valid JSON", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const request = new Request("http://localhost/api/monitors/123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await PATCH_monitor(request, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 when body is not an object", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const request = new Request("http://localhost/api/monitors/123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });

    const response = await PATCH_monitor(request, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(400);
  });

  it("patches with correct basic auth", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret456");

    // Create a monitor first
    const createRequest = new Request("http://localhost/api/monitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Basic ${Buffer.from("admin:secret456").toString("base64")}`,
      },
      body: JSON.stringify({
        name: "Auth Test Monitor",
        url: "https://example.com",
      }),
    });

    const createResponse = await POST_monitors(createRequest);
    const { monitor } = await createResponse.json();

    // PATCH with auth
    const encoded = Buffer.from("admin:secret456").toString("base64");
    const patchRequest = new Request(
      `http://localhost/api/monitors/${monitor.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Basic ${encoded}`,
        },
        body: JSON.stringify({ active: false }),
      }
    );

    const patchResponse = await PATCH_monitor(patchRequest, {
      params: Promise.resolve({ id: monitor.id }),
    });

    expect(patchResponse.status).toBe(200);
  });
});
