import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { logAudit, setAuditActor } from "@/lib/rules";

const vehicleUpdateSchema = z.object({
  registrationNumber: z.string().min(1).optional(),
  nameModel: z.string().min(1).optional(),
  type: z.enum(["VAN", "TRUCK", "MINI", "OTHER"]).optional(),
  maxLoadCapacityKg: z.number().positive().optional(),
  odometerKm: z.number().min(0).optional(),
  acquisitionCost: z.number().min(0).optional(),
  region: z.string().optional(),
  status: z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]">) {
  const session = withAuth(request, ["FLEET_MANAGER"]);
  if (isResponse(session)) return session;
  setAuditActor(session.email);

  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const data = vehicleUpdateSchema.parse(body);
    const before = await prisma.vehicle.findUnique({ where: { id }, select: { status: true } });
    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    if (data.status && before && before.status !== data.status) {
      await logAudit("VEHICLE", id, "STATUS_CHANGE", before.status, data.status);
    }
    return NextResponse.json({ vehicle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]">) {
  const session = withAuth(request, ["FLEET_MANAGER"]);
  if (isResponse(session)) return session;

  try {
    const { id } = await ctx.params;
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
