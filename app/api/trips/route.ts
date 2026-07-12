import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { createTrip, setAuditActor } from "@/lib/rules";

const tripCreateSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  cargoWeightKg: z.number().positive(),
  plannedDistanceKm: z.number().positive(),
});

export async function GET(request: NextRequest) {
  const session = withAuth(request, null);
  if (isResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const trips = await prisma.trip.findMany({
    where: status ? { status: status as never } : {},
    include: { vehicle: true, driver: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ trips });
}

export async function POST(request: NextRequest) {
  const session = withAuth(request, ["DISPATCHER"]);
  if (isResponse(session)) return session;
  setAuditActor(session.email);

  try {
    const body = await request.json();
    const data = tripCreateSchema.parse(body);
    const count = await prisma.trip.count();
    const tripCode = `TR${String(count + 1).padStart(3, "0")}`;
    const trip = await createTrip({ ...data, tripCode });
    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return handleApiError(error);
  }
}
