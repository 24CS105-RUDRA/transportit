import { Prisma, TripStatus, VehicleStatus, DriverStatus, MaintenanceStatus } from "@prisma/client";
import { prisma } from "./prisma";

export class RuleViolation extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

let auditActor: string | null = null;
export function setAuditActor(email: string | null) {
  auditActor = email;
}

export async function logAudit(
  entityType: string,
  entityId: string,
  action: string,
  fromStatus?: string | null,
  toStatus?: string | null,
  note?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        note: note ?? null,
        actorEmail: auditActor,
      },
    });
  } catch {
    // audit failures should never break the main operation
  }
}

export async function createTrip(input: {
  tripCode: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeightKg: number;
  plannedDistanceKm: number;
}) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new RuleViolation("Vehicle not found", 404);
  if (vehicle.status === "IN_SHOP" || vehicle.status === "RETIRED") {
    throw new RuleViolation("Vehicle is not eligible for dispatch (In Shop or Retired)");
  }
  if (input.cargoWeightKg > vehicle.maxLoadCapacityKg) {
    throw new RuleViolation(
      `Capacity exceeded by ${(input.cargoWeightKg - vehicle.maxLoadCapacityKg).toFixed(0)} kg`
    );
  }

  const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
  if (!driver) throw new RuleViolation("Driver not found", 404);
  if (driver.status === "SUSPENDED") {
    throw new RuleViolation("Driver is suspended and cannot be assigned to trips");
  }
  if (driver.licenseExpiryDate < new Date()) {
    throw new RuleViolation("Driver's license has expired");
  }

  const trip = await prisma.trip.create({
    data: {
      tripCode: input.tripCode,
      source: input.source,
      destination: input.destination,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      cargoWeightKg: input.cargoWeightKg,
      plannedDistanceKm: input.plannedDistanceKm,
      status: "DRAFT",
    },
  });
  await logAudit("TRIP", trip.id, "CREATE", null, "DRAFT", trip.tripCode);
  return trip;
}

export async function dispatchTrip(tripId: string) {
  let updated: any;
  await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      include: { vehicle: true, driver: true },
      where: { id: tripId },
    });
    if (!trip) throw new RuleViolation("Trip not found", 404);
    if (trip.status !== "DRAFT") {
      throw new RuleViolation("Only Draft trips can be dispatched");
    }
    if (!trip.source || !trip.destination || !trip.cargoWeightKg || !trip.plannedDistanceKm) {
      throw new RuleViolation("Trip is missing required fields for dispatch");
    }

    const vehicle = trip.vehicle;
    if (vehicle.status === "IN_SHOP" || vehicle.status === "RETIRED") {
      throw new RuleViolation("Vehicle is not eligible for dispatch (In Shop or Retired)");
    }
    if (vehicle.status === "ON_TRIP") {
      throw new RuleViolation("Vehicle is already on another trip");
    }
    if (trip.cargoWeightKg > vehicle.maxLoadCapacityKg) {
      throw new RuleViolation(
        `Capacity exceeded by ${(trip.cargoWeightKg - vehicle.maxLoadCapacityKg).toFixed(0)} kg — dispatch blocked`
      );
    }

    const driver = trip.driver;
    if (driver.status === "SUSPENDED") {
      throw new RuleViolation("Driver is suspended and cannot be assigned to trips");
    }
    if (driver.status === "ON_TRIP") {
      throw new RuleViolation("Driver is already on another trip");
    }
    if (driver.licenseExpiryDate < new Date()) {
      throw new RuleViolation("Driver's license has expired");
    }

    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { status: VehicleStatus.ON_TRIP },
    });
    await tx.driver.update({
      where: { id: driver.id },
      data: { status: DriverStatus.ON_TRIP },
    });
    updated = await tx.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.DISPATCHED, dispatchedAt: new Date() },
    });
  });
  await logAudit("TRIP", tripId, "DISPATCH", "DRAFT", "DISPATCHED");
  return updated;
}

export async function completeTrip(
  tripId: string,
  input: {
    finalOdometerKm: number;
    fuelConsumedL: number;
    fuelCost?: number;
    revenue?: number;
  }
) {
  let updatedTrip: any;
  await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      include: { vehicle: true, driver: true },
      where: { id: tripId },
    });
    if (!trip) throw new RuleViolation("Trip not found", 404);
    if (trip.status !== "DISPATCHED") {
      throw new RuleViolation("Only Dispatched trips can be completed");
    }

    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: {
        status: VehicleStatus.AVAILABLE,
        odometerKm: input.finalOdometerKm,
      },
    });
    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: DriverStatus.AVAILABLE },
    });

    updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.COMPLETED,
        completedAt: new Date(),
        finalOdometerKm: input.finalOdometerKm,
        fuelConsumedL: input.fuelConsumedL,
        revenue: input.revenue,
      },
    });

    if (input.fuelConsumedL > 0) {
      await tx.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          date: new Date(),
          liters: input.fuelConsumedL,
          cost: input.fuelCost ?? 0,
        },
      });
    }

    return updatedTrip;
  });
  await logAudit("TRIP", tripId, "COMPLETE", "DISPATCHED", "COMPLETED");
  return updatedTrip;
}

export async function cancelTrip(tripId: string, reason?: string) {
  let prev: any;
  let updated: any;
  await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new RuleViolation("Trip not found", 404);
    if (trip.status !== "DRAFT" && trip.status !== "DISPATCHED") {
      throw new RuleViolation("Only Draft or Dispatched trips can be cancelled");
    }

    if (trip.status === "DISPATCHED") {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.AVAILABLE },
      });
    }

    prev = trip.status;
    updated = await tx.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.CANCELLED, cancelReason: reason || null },
    });
  });
  await logAudit("TRIP", tripId, "CANCEL", prev, "CANCELLED", reason);
  return updated;
}

export async function createMaintenanceLog(input: {
  vehicleId: string;
  serviceType: string;
  servicerName?: string;
  cost: number;
  date: Date;
}) {
  let log: any;
  await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw new RuleViolation("Vehicle not found", 404);
    if (vehicle.status === "ON_TRIP") {
      throw new RuleViolation("Cannot create maintenance for a vehicle that is On Trip");
    }

    log = await tx.maintenanceLog.create({
      data: {
        vehicleId: input.vehicleId,
        serviceType: input.serviceType,
        servicerName: input.servicerName,
        cost: input.cost,
        date: input.date,
        status: MaintenanceStatus.ACTIVE,
      },
    });

    if (vehicle.status !== "RETIRED") {
      await tx.vehicle.update({
        where: { id: input.vehicleId },
        data: { status: VehicleStatus.IN_SHOP },
      });
    }

    return log;
  });
  await logAudit("MAINTENANCE", log.id, "CREATE", null, "ACTIVE", input.serviceType);
  return log;
}

export async function closeMaintenanceLog(logId: string) {
  let updated: any;
  await prisma.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.findUnique({
      include: { vehicle: true },
      where: { id: logId },
    });
    if (!log) throw new RuleViolation("Maintenance log not found", 404);
    if (log.status === "COMPLETED") {
      throw new RuleViolation("Maintenance log is already completed");
    }

    updated = await tx.maintenanceLog.update({
      where: { id: logId },
      data: { status: MaintenanceStatus.COMPLETED },
    });

    const otherActiveLogs = await tx.maintenanceLog.count({
      where: { vehicleId: log.vehicleId, status: "ACTIVE", id: { not: logId } },
    });

    if (otherActiveLogs === 0 && log.vehicle.status !== "RETIRED") {
      await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
    }

    return updated;
  });
  await logAudit("MAINTENANCE", logId, "CLOSE", "ACTIVE", "COMPLETED");
  return updated;
}

export type { Prisma };
