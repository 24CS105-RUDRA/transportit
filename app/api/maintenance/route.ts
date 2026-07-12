import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { createMaintenanceLog, setAuditActor } from "@/lib/rules";

const maintenanceSchema = z.object({
  vehicleId: z.string().min(1),
  serviceType: z.string().min(1),
  servicerName: z.string().optional(),
  cost: z.number().min(0),
  date: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = withAuth(request, null);
  if (isResponse(session)) return session;

  const logs = await prisma.maintenanceLog.findMany({
    include: { vehicle: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ logs });
}

export async function POST(request: NextRequest) {
  const session = withAuth(request, ["FLEET_MANAGER"]);
  if (isResponse(session)) return session;
  setAuditActor(session.email);

  try {
    const body = await request.json();
    const parsed = maintenanceSchema.parse(body);
    const log = await createMaintenanceLog({
      vehicleId: parsed.vehicleId,
      serviceType: parsed.serviceType,
      servicerName: parsed.servicerName,
      cost: parsed.cost,
      date: new Date(parsed.date),
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
