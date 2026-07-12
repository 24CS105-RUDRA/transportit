import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/vehicles/[id]">
) {
  const session = withAuth(request, ["FLEET_MANAGER"]);
  if (isResponse(session)) return session;

  try {
    const { id } = await ctx.params;
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const [trips, fuelLogs, maintenanceLogs] = await Promise.all([
      prisma.trip.findMany({
        where: { vehicleId: id },
        include: { driver: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.fuelLog.findMany({ where: { vehicleId: id }, orderBy: { date: "desc" } }),
      prisma.maintenanceLog.findMany({
        where: { vehicleId: id },
        orderBy: { date: "desc" },
      }),
    ]);

    const totalFuelCost = fuelLogs.reduce((a, f) => a + f.cost, 0);
    const totalMaintenance = maintenanceLogs
      .filter((m) => m.status === "COMPLETED")
      .reduce((a, m) => a + m.cost, 0);
    const totalRevenue = trips
      .filter((t) => t.status === "COMPLETED")
      .reduce((a, t) => a + (t.revenue ?? 0), 0);
    const acquisitionCost = vehicle.acquisitionCost ?? 0;
    const roi =
      acquisitionCost > 0
        ? (totalRevenue - (totalFuelCost + totalMaintenance)) / acquisitionCost
        : 0;

    return NextResponse.json({
      vehicle,
      trips,
      fuelLogs,
      maintenanceLogs,
      stats: {
        totalFuelCost,
        totalMaintenance,
        totalRevenue,
        roi,
        tripCount: trips.length,
        completedTripCount: trips.filter((t) => t.status === "COMPLETED").length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
