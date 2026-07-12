import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { completeTrip, setAuditActor } from "@/lib/rules";

const completeSchema = z.object({
  finalOdometerKm: z.number().min(0),
  fuelConsumedL: z.number().min(0),
  fuelCost: z.number().min(0).optional(),
  revenue: z.number().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/trips/[id]/complete">
) {
  const session = withAuth(request, ["DISPATCHER"]);
  if (isResponse(session)) return session;
  setAuditActor(session.email);

  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const parsed = completeSchema.parse(body);
    const trip = await completeTrip(id, parsed);
    return NextResponse.json({ trip });
  } catch (error) {
    return handleApiError(error);
  }
}
