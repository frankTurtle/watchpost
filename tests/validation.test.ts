import { describe, it, expect } from "vitest";
import { parseNewMonitor } from "@/lib/validation";

describe("parseNewMonitor", () => {
  // Valid cases
  it("accepts valid minimal monitor", () => {
    const result = parseNewMonitor({
      name: "Test Monitor",
      url: "https://example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Test Monitor");
      expect(result.value.url).toBe("https://example.com");
      expect(result.value.method).toBe("GET");
      expect(result.value.interval_minutes).toBe(5);
    }
  });

  it("accepts valid full monitor with all fields", () => {
    const result = parseNewMonitor({
      name: "Full Monitor",
      url: "http://localhost:3000",
      method: "HEAD",
      interval_minutes: 60,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Full Monitor");
      expect(result.value.url).toBe("http://localhost:3000");
      expect(result.value.method).toBe("HEAD");
      expect(result.value.interval_minutes).toBe(60);
    }
  });

  it("trims name whitespace", () => {
    const result = parseNewMonitor({
      name: "  Trimmed  ",
      url: "https://example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Trimmed");
    }
  });

  // Name validation failures
  it("rejects non-string name", () => {
    const result = parseNewMonitor({
      name: 123,
      url: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("name must be a non-empty string");
    }
  });

  it("rejects empty name", () => {
    const result = parseNewMonitor({
      name: "",
      url: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("name must be a non-empty string");
    }
  });

  it("rejects whitespace-only name", () => {
    const result = parseNewMonitor({
      name: "   ",
      url: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("name must be a non-empty string");
    }
  });

  it("rejects name exceeding 100 characters", () => {
    const longName = "a".repeat(101);
    const result = parseNewMonitor({
      name: longName,
      url: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("name must not exceed 100 characters");
    }
  });

  it("accepts name of exactly 100 characters", () => {
    const exactName = "a".repeat(100);
    const result = parseNewMonitor({
      name: exactName,
      url: "https://example.com",
    });
    expect(result.ok).toBe(true);
  });

  // URL validation failures
  it("rejects non-string URL", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: 123,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("url must be a string");
    }
  });

  it("rejects invalid URL format", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "not a valid url",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("url must be a valid URL");
    }
  });

  it("rejects ftp:// protocol", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "ftp://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("url must use http or https protocol");
    }
  });

  it("rejects file:// protocol", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "file:///etc/passwd",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("url must use http or https protocol");
    }
  });

  it("accepts http:// protocol", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "http://example.com",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts https:// protocol", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
    });
    expect(result.ok).toBe(true);
  });

  // Method validation failures
  it("defaults method to GET when not provided", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.method).toBe("GET");
    }
  });

  it("rejects non-string method", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
      method: 123,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("method must be a string");
    }
  });

  it("rejects invalid method value", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
      method: "POST",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('method must be "GET" or "HEAD"');
    }
  });

  it("accepts HEAD method", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
      method: "HEAD",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.method).toBe("HEAD");
    }
  });

  // Interval validation failures
  it("defaults interval_minutes to 5 when not provided", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.interval_minutes).toBe(5);
    }
  });

  it("rejects non-integer interval", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
      interval_minutes: 5.5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("interval_minutes must be an integer");
    }
  });

  it("rejects interval of 0", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
      interval_minutes: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(
        "interval_minutes must be between 1 and 1440"
      );
    }
  });

  it("rejects interval above 1440", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
      interval_minutes: 1441,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(
        "interval_minutes must be between 1 and 1440"
      );
    }
  });

  it("accepts interval of 1", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
      interval_minutes: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.interval_minutes).toBe(1);
    }
  });

  it("accepts interval of 1440", () => {
    const result = parseNewMonitor({
      name: "Test",
      url: "https://example.com",
      interval_minutes: 1440,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.interval_minutes).toBe(1440);
    }
  });

  // Request body validation
  it("rejects null body", () => {
    const result = parseNewMonitor(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Request body must be a JSON object");
    }
  });

  it("rejects non-object body", () => {
    const result = parseNewMonitor("not an object");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Request body must be a JSON object");
    }
  });

  it("rejects array body", () => {
    const result = parseNewMonitor([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Arrays pass typeof check but fail name validation
      expect(result.error).toContain("name must be a non-empty string");
    }
  });

  // Missing required fields
  it("rejects when name is missing", () => {
    const result = parseNewMonitor({
      url: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("name must be a non-empty string");
    }
  });

  it("rejects when url is missing", () => {
    const result = parseNewMonitor({
      name: "Test",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("url must be a string");
    }
  });
});
