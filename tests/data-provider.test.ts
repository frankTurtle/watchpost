import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getDataProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns demo provider when supabase credentials are not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { getDataProvider } = await import("@/lib/data");
    const provider = getDataProvider();

    // Should be able to use demo provider methods
    const monitors = await provider.listMonitors();
    expect(Array.isArray(monitors)).toBe(true);
  });

  it("returns same cached instance on repeated calls", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { getDataProvider } = await import("@/lib/data");
    const provider1 = getDataProvider();
    const provider2 = getDataProvider();

    expect(provider1).toBe(provider2);
  });

  it("logs demo mode message only once", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const consoleLogSpy = vi.spyOn(console, "log");

    const { getDataProvider } = await import("@/lib/data");
    getDataProvider();
    getDataProvider();
    getDataProvider();

    const demoMessages = consoleLogSpy.mock.calls.filter((call) =>
      String(call[0]).includes("demo mode")
    );

    expect(demoMessages.length).toBe(1);

    consoleLogSpy.mockRestore();
  });

  it("has isDemoMode utility function", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { isDemoMode } = await import("@/lib/data");
    expect(isDemoMode()).toBe(true);
  });

  it("detects demo mode correctly when only URL is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { getDataProvider, isDemoMode } = await import("@/lib/data");
    getDataProvider();

    // Should be demo mode because service role key is missing
    expect(isDemoMode()).toBe(true);
  });

  it("detects demo mode correctly when only service role key is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "some-key");

    const { getDataProvider, isDemoMode } = await import("@/lib/data");
    getDataProvider();

    // Should be demo mode because URL is missing
    expect(isDemoMode()).toBe(true);
  });
});
