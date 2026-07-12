import { NextRequest, NextResponse } from "next/server";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { cancelTrip, setAuditActor } from "@/lib/rules";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/trips/[id]/cancel">
) {
  const session = withAuth(request, ["DISPATCHER"]);
  if (isResponse(session)) return session;
  setAuditActor(session.email);

  try {
    const { id } = await ctx.params;
    const body = request.method === "POST" && request.headers.get("content-type")?.includes("application/json")
      ? await request.json().catch(() => ({}))
      : {};
    const trip = await cancelTrip(id, body?.reason);
    return NextResponse.json({ trip });
  } catch (error) {
    return handleApiError(error);
  }
}
