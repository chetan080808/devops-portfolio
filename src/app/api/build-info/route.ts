import { connection } from "next/server";
import { getBuildInfo, getRuntimeInfo } from "@/lib/buildInfo";

/**
 * Build and pod details for the footer's "behind the scenes" panel. Rendered per request (never
 * prerendered or cached), so `pod` is the pod that answered this request.
 */
export async function GET() {
  await connection();
  return Response.json(
    { ...getBuildInfo(), ...getRuntimeInfo() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
