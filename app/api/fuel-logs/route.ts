import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";

const fuelLogSchema = z.object({
  vehicleId: z.string().min(1),
  tripId: z.string().optional(),
  date: z.string().min(1),
  liters: z.number().positive(),
  cost: z.number().min(0),
});

export async function GET(request: NextRequest) {
  const session = withAuth(request, null);
  if (isResponse(session)) return session;

  const logs = await prisma.fuelLog.findMany({
    include: { vehicle: true, trip: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ logs });
}

export async function POST(request: NextRequest) {
  const session = withAuth(request, ["FINANCIAL_ANALYST", "FLEET_MANAGER"]);
  if (isResponse(session)) return session;

  try {
    const body = await request.json();
    const parsed = fuelLogSchema.parse(body);
    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: parsed.vehicleId,
        tripId: parsed.tripId,
        date: new Date(parsed.date),
        liters: parsed.liters,
        cost: parsed.cost,
      },
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
