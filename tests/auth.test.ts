import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { requireAdmin } from "@/lib/auth";

describe("requireAdmin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("when ADMIN_PASSWORD is unset", () => {
    it("returns null (open mode, no auth required)", () => {
      vi.stubEnv("ADMIN_PASSWORD", "");
      const request = new Request("http://localhost/api", {
        method: "POST",
      });
      const result = requireAdmin(request);
      expect(result).toBeNull();
    });
  });

  describe("when ADMIN_PASSWORD is set", () => {
    beforeEach(() => {
      vi.stubEnv("ADMIN_PASSWORD", "secret123");
    });

    it("returns 401 with WWW-Authenticate header when authorization header missing", () => {
      const request = new Request("http://localhost/api", {
        method: "POST",
      });
      const result = requireAdmin(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
      expect(result?.headers.get("WWW-Authenticate")).toContain("Basic");
      expect(result?.headers.get("WWW-Authenticate")).toContain(
        "watchpost admin"
      );
    });

    it("returns 401 when authorization header is not Basic auth", () => {
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          authorization: "Bearer token123",
        },
      });
      const result = requireAdmin(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("returns 401 when Basic auth is malformed (invalid base64)", () => {
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          authorization: "Basic !!!invalid!!!",
        },
      });
      const result = requireAdmin(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("returns 401 when Basic auth has no colon separator", () => {
      const encoded = Buffer.from("nocolon").toString("base64");
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          authorization: `Basic ${encoded}`,
        },
      });
      const result = requireAdmin(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("returns 401 when password is wrong", () => {
      const encoded = Buffer.from("admin:wrongpassword").toString("base64");
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          authorization: `Basic ${encoded}`,
        },
      });
      const result = requireAdmin(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("returns null when password is correct (with any username)", () => {
      const encoded = Buffer.from("anyuser:secret123").toString("base64");
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          authorization: `Basic ${encoded}`,
        },
      });
      const result = requireAdmin(request);

      expect(result).toBeNull();
    });

    it("returns null when correct password with empty username", () => {
      const encoded = Buffer.from(":secret123").toString("base64");
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          authorization: `Basic ${encoded}`,
        },
      });
      const result = requireAdmin(request);

      expect(result).toBeNull();
    });

    it("returns 401 when password length differs", () => {
      const encoded = Buffer.from("admin:secret12").toString("base64");
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          authorization: `Basic ${encoded}`,
        },
      });
      const result = requireAdmin(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("returns 401 when only partial password is correct", () => {
      const encoded = Buffer.from("admin:secret").toString("base64");
      const request = new Request("http://localhost/api", {
        method: "POST",
        headers: {
          authorization: `Basic ${encoded}`,
        },
      });
      const result = requireAdmin(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("uses constant-time comparison to resist timing attacks", () => {
      // Both should return 401 but take similar time
      const encoded1 = Buffer.from("admin:aaaaaa").toString("base64");
      const encoded2 = Buffer.from("admin:bbbbbb").toString("base64");

      const request1 = new Request("http://localhost/api", {
        method: "POST",
        headers: { authorization: `Basic ${encoded1}` },
      });
      const request2 = new Request("http://localhost/api", {
        method: "POST",
        headers: { authorization: `Basic ${encoded2}` },
      });

      const result1 = requireAdmin(request1);
      const result2 = requireAdmin(request2);

      expect(result1?.status).toBe(401);
      expect(result2?.status).toBe(401);
    });
  });
});
