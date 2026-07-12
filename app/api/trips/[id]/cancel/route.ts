import { NextRequest, NextResponse } from "next/server";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { cancelTrip } from "@/lib/rules";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/trips/[id]/cancel">
) {
  const session = withAuth(request, ["DISPATCHER"]);
  if (isResponse(session)) return session;

  try {
    const { id } = await ctx.params;
    const trip = await cancelTrip(id);
    return NextResponse.json({ trip });
  } catch (error) {
    return handleApiError(error);
  }
}
