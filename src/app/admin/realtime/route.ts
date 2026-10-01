import { isAdmin } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getLiveSnapshot } from "@/lib/live";

export const dynamic = "force-dynamic";

/** Live data for the Analytics page, polled every 30 seconds while the page is open. Admin only. */
export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!dbConfigured) return Response.json({ error: "Database not configured" }, { status: 503 });
  try {
    return Response.json(await getLiveSnapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Live data unavailable" }, { status: 502 });
  }
}
