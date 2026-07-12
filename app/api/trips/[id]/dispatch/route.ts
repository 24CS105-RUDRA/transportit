import { NextRequest, NextResponse } from "next/server";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { dispatchTrip, setAuditActor } from "@/lib/rules";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/trips/[id]/dispatch">) {
  const session = withAuth(request, ["DISPATCHER"]);
  if (isResponse(session)) return session;
  setAuditActor(session.email);

  try {
    const { id } = await ctx.params;
    const trip = await dispatchTrip(id);
    return NextResponse.json({ trip });
  } catch (error) {
    return handleApiError(error);
  }
}
