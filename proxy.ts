import { NextRequest, NextResponse } from "next/server";

function constantTimeCompare(a: string, b: string): boolean {
  const aLen = a.length;
  const bLen = b.length;
  let result = aLen ^ bLen;

  const maxLen = Math.max(aLen, bLen);
  for (let i = 0; i < maxLen; i++) {
    const aChar = i < aLen ? a.charCodeAt(i) : 0;
    const bChar = i < bLen ? b.charCodeAt(i) : 0;
    result |= aChar ^ bChar;
  }

  return result === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // Open instance, allow access
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="watchpost admin"',
      },
    });
  }

  const encoded = authHeader.slice(6);
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return new NextResponse(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="watchpost admin"',
      },
    });
  }

  const colonIndex = decoded.indexOf(":");
  if (colonIndex === -1) {
    return new NextResponse(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="watchpost admin"',
      },
    });
  }

  const providedPassword = decoded.slice(colonIndex + 1);

  if (!constantTimeCompare(providedPassword, password)) {
    return new NextResponse(null, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="watchpost admin"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
