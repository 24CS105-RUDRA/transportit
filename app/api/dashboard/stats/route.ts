import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse } from "@/lib/api-guard";

export async function GET(request: NextRequest) {
  const session = withAuth(request, null);
  if (isResponse(session)) return session;

  const [
    vehicles,
    drivers,
    trips,
    maintenanceActive,
    expiringLicenses,
  ] = await Promise.all([
    prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.driver.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.trip.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.maintenanceLog.count({ where: { status: "ACTIVE" } }),
    prisma.driver.count({
      where: {
        licenseExpiryDate: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) },
        status: { not: "SUSPENDED" },
      },
    }),
  ]);

  const vehicleBy = (s: string) =>
    vehicles.find((v) => v.status === s)?._count._all ?? 0;
  const driverBy = (s: string) =>
    drivers.find((d) => d.status === s)?._count._all ?? 0;
  const tripBy = (s: string) =>
    trips.find((t) => t.status === s)?._count._all ?? 0;

  const totalVehicles = vehicles.reduce((a, v) => a + v._count._all, 0);
  const nonRetiredVehicles = totalVehicles - vehicleBy("RETIRED");
  const onTripVehicles = vehicleBy("ON_TRIP");
  const fleetUtilization =
    nonRetiredVehicles > 0
      ? Math.round((onTripVehicles / nonRetiredVehicles) * 100)
      : 0;

  return NextResponse.json({
    vehicles: {
      total: totalVehicles,
      available: vehicleBy("AVAILABLE"),
      onTrip: onTripVehicles,
      inShop: vehicleBy("IN_SHOP"),
      retired: vehicleBy("RETIRED"),
    },
    drivers: {
      total: drivers.reduce((a, d) => a + d._count._all, 0),
      available: driverBy("AVAILABLE"),
      onTrip: driverBy("ON_TRIP"),
      offDuty: driverBy("OFF_DUTY"),
      suspended: driverBy("SUSPENDED"),
    },
    trips: {
      total: trips.reduce((a, t) => a + t._count._all, 0),
      draft: tripBy("DRAFT"),
      dispatched: tripBy("DISPATCHED"),
      completed: tripBy("COMPLETED"),
      cancelled: tripBy("CANCELLED"),
    },
    fleetUtilization,
    maintenanceActive,
    expiringLicenses,
  });
}
