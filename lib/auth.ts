/**
 * Require admin authentication via HTTP Basic Auth.
 * If ADMIN_PASSWORD is unset/empty, returns null (open/demo mode).
 * On auth failure or missing header, returns a 401 Response.
 * On success, returns null.
 */
export function requireAdmin(request: Request): Response | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return null; // Open instance, no auth required
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new Response(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="watchpost admin"',
      },
    });
  }

  const encoded = authHeader.slice(6); // Remove "Basic " prefix
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return new Response(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="watchpost admin"',
      },
    });
  }

  // Format is "username:password" (username is ignored)
  const colonIndex = decoded.indexOf(":");
  if (colonIndex === -1) {
    return new Response(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="watchpost admin"',
      },
    });
  }

  const providedPassword = decoded.slice(colonIndex + 1);

  // Constant-time comparison using manual XOR-accumulator loop
  if (!constantTimeCompare(providedPassword, password)) {
    return new Response(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="watchpost admin"',
      },
    });
  }

  return null; // Auth successful
}

/**
 * Constant-time string comparison using XOR-accumulator over char codes.
 * Always compares both strings fully, regardless of length.
 */
function constantTimeCompare(a: string, b: string): boolean {
  const aLen = a.length;
  const bLen = b.length;
  let result = aLen ^ bLen; // XOR the lengths

  // Compare up to the length of the longer string
  const maxLen = Math.max(aLen, bLen);
  for (let i = 0; i < maxLen; i++) {
    const aChar = i < aLen ? a.charCodeAt(i) : 0;
    const bChar = i < bLen ? b.charCodeAt(i) : 0;
    result |= aChar ^ bChar; // XOR char codes and accumulate
  }

  return result === 0;
}
