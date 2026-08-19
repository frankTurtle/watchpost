import { NewMonitor } from "@/lib/types";

export function parseNewMonitor(
  body: unknown
): { ok: true; value: NewMonitor } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const obj = body as Record<string, unknown>;

  // Validate name
  if (typeof obj.name !== "string" || obj.name.trim().length === 0) {
    return { ok: false, error: "name must be a non-empty string" };
  }
  if (obj.name.length > 100) {
    return { ok: false, error: "name must not exceed 100 characters" };
  }

  // Validate URL
  if (typeof obj.url !== "string") {
    return { ok: false, error: "url must be a string" };
  }
  try {
    const url = new URL(obj.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        ok: false,
        error: "url must use http or https protocol",
      };
    }
  } catch {
    return { ok: false, error: "url must be a valid URL" };
  }

  // Validate method
  let method: "GET" | "HEAD" = "GET";
  if (obj.method !== undefined) {
    if (typeof obj.method !== "string") {
      return { ok: false, error: "method must be a string" };
    }
    if (obj.method !== "GET" && obj.method !== "HEAD") {
      return {
        ok: false,
        error: 'method must be "GET" or "HEAD"',
      };
    }
    method = obj.method;
  }

  // Validate interval_minutes
  let interval_minutes = 5;
  if (obj.interval_minutes !== undefined) {
    if (!Number.isInteger(obj.interval_minutes)) {
      return { ok: false, error: "interval_minutes must be an integer" };
    }
    const minutes = obj.interval_minutes as number;
    if (minutes < 1 || minutes > 1440) {
      return {
        ok: false,
        error: "interval_minutes must be between 1 and 1440",
      };
    }
    interval_minutes = minutes;
  }

  return {
    ok: true,
    value: {
      name: obj.name.trim(),
      url: obj.url,
      method,
      interval_minutes,
    },
  };
}
