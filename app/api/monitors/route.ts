import { getDataProvider } from "@/lib/data";
import { parseNewMonitor } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const provider = getDataProvider();
  const monitors = await provider.listMonitors();
  return Response.json({ monitors });
}

export async function POST(request: Request) {
  // Check admin auth
  const authError = requireAdmin(request);
  if (authError) {
    return authError;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const validation = parseNewMonitor(body);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const provider = getDataProvider();
  const monitor = await provider.createMonitor(validation.value);
  return Response.json({ monitor }, { status: 201 });
}
