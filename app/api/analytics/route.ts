import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse } from "@/lib/api-guard";

export async function GET(request: NextRequest) {
  const session = withAuth(request, null);
  if (isResponse(session)) return session;

  const [
    vehicles,
    fuelLogs,
    maintenanceLogs,
    completedTrips,
    tripCount,
  ] = await Promise.all([
    prisma.vehicle.findMany(),
    prisma.fuelLog.findMany(),
    prisma.maintenanceLog.findMany({ where: { status: "ACTIVE" } }),
    prisma.trip.findMany({ where: { status: "COMPLETED" } }),
    prisma.trip.count(),
  ]);

  const totalFuelLiters = fuelLogs.reduce((a, f) => a + f.liters, 0);
  const totalFuelCost = fuelLogs.reduce((a, f) => a + f.cost, 0);
  const totalMaintenance = maintenanceLogs.reduce((a, m) => a + m.cost, 0);
  const totalRevenue = completedTrips.reduce((a, t) => a + (t.revenue ?? 0), 0);
  const totalDistance = completedTrips.reduce(
    (a, t) => a + (t.plannedDistanceKm ?? 0),
    0
  );

  const fleetFuelEfficiency =
    totalFuelLiters > 0 ? totalDistance / totalFuelLiters : 0;
  const operationalCost = totalFuelCost + totalMaintenance;
  const fleetUtilization =
    tripCount > 0
      ? Math.round((completedTrips.length / tripCount) * 100)
      : 0;

  // Costliest vehicles by fuel + maintenance
  const costByVehicle = new Map<string, number>();
  for (const f of fuelLogs) {
    costByVehicle.set(
      f.vehicleId,
      (costByVehicle.get(f.vehicleId) ?? 0) + f.cost
    );
  }
  for (const m of maintenanceLogs) {
    costByVehicle.set(
      m.vehicleId,
      (costByVehicle.get(m.vehicleId) ?? 0) + m.cost
    );
  }
  const topCostliestVehicles = vehicles
    .map((v) => ({
      id: v.id,
      plate: v.registrationNumber,
      model: v.nameModel,
      cost: costByVehicle.get(v.id) ?? 0,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  // Revenue per vehicle
  const revenueByVehicle = new Map<string, number>();
  for (const t of completedTrips) {
    if (!t.vehicleId) continue;
    revenueByVehicle.set(
      t.vehicleId,
      (revenueByVehicle.get(t.vehicleId) ?? 0) + (t.revenue ?? 0)
    );
  }
  const vehicleRoi = vehicles
    .map((v) => {
      const cost = costByVehicle.get(v.id) ?? 0;
      const revenue = revenueByVehicle.get(v.id) ?? 0;
      return {
        id: v.id,
        plate: v.registrationNumber,
        model: v.nameModel,
        revenue,
        cost,
        roi: cost > 0 ? revenue / cost - 1 : 0,
      };
    })
    .sort((a, b) => b.roi - a.roi);

  return NextResponse.json({
    fleetFuelEfficiency: Number(fleetFuelEfficiency.toFixed(2)),
    operationalCost,
    totalRevenue,
    fleetUtilization,
    totalFuelCost,
    totalMaintenance,
    topCostliestVehicles,
    vehicleRoi,
  });
}
