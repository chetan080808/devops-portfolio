import { connection } from "next/server";

/**
 * Liveness/readiness probe for Docker HEALTHCHECK and Kubernetes. Always rendered at request
 * time (never prerendered), so a 200 means the Node server is actually answering.
 */
export async function GET() {
  await connection();
  return Response.json(
    { status: "ok", uptime: Math.round(process.uptime()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
