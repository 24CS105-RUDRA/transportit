import { NextRequest, NextResponse } from "next/server";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { closeMaintenanceLog } from "@/lib/rules";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]/close">
) {
  const session = withAuth(request, ["FLEET_MANAGER"]);
  if (isResponse(session)) return session;

  try {
    const { id } = await ctx.params;
    const log = await closeMaintenanceLog(id);
    return NextResponse.json({ log });
  } catch (error) {
    return handleApiError(error);
  }
}
