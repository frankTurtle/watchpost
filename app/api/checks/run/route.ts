import { requireAdmin } from "@/lib/auth";
import { runChecksOnce } from "@/lib/checks/run";

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) {
    return denied;
  }

  try {
    const summary = await runChecksOnce();
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Check run failed:", error);
    return Response.json(
      { error: "check run failed" },
      { status: 500 }
    );
  }
}
