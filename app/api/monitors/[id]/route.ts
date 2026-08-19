import { getDataProvider } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  // Check admin auth
  const authError = requireAdmin(request);
  if (authError) {
    return authError;
  }

  const { id } = await props.params;
  const provider = getDataProvider();
  await provider.deleteMonitor(id);
  return new Response(null, { status: 204 });
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
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

  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const obj = body as Record<string, unknown>;
  if (typeof obj.active !== "boolean") {
    return Response.json(
      { error: "active must be a boolean" },
      { status: 400 }
    );
  }

  const { id } = await props.params;
  const provider = getDataProvider();
  await provider.setMonitorActive(id, obj.active);
  return Response.json({ ok: true });
}
