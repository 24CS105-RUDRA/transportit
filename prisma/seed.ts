import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.vehiclePosition.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  await prisma.user.createMany({
    data: [
      {
        name: "Frank Fleet",
        email: "fleetmanager@transitops.com",
        passwordHash: password,
        role: "FLEET_MANAGER",
      },
      {
        name: "Dana Dispatcher",
        email: "dispatcher@transitops.com",
        passwordHash: password,
        role: "DISPATCHER",
      },
      {
        name: "Sam Safety",
        email: "safety@transitops.com",
        passwordHash: password,
        role: "SAFETY_OFFICER",
      },
      {
        name: "Fiona Finance",
        email: "finance@transitops.com",
        passwordHash: password,
        role: "FINANCIAL_ANALYST",
      },
    ],
  });

  await prisma.settings.create({
    data: {
      depotName: "Central Depot",
      currency: "INR",
      distanceUnit: "km",
      rolePermissions: JSON.stringify({
        FLEET_MANAGER: { fleet: "edit", drivers: "view", trips: "view", fuelExpenses: "view", analytics: "edit" },
        DISPATCHER: { fleet: "view", drivers: "view", trips: "edit", fuelExpenses: "-", analytics: "-" },
        SAFETY_OFFICER: { fleet: "view", drivers: "edit", trips: "view", fuelExpenses: "-", analytics: "-" },
        FINANCIAL_ANALYST: { fleet: "view", drivers: "-", trips: "view", fuelExpenses: "edit", analytics: "edit" },
      }),
    },
  });

  const vanNorth = await prisma.vehicle.create({
    data: {
      registrationNumber: "VAN-05",
      nameModel: "Ford Transit",
      type: "VAN",
      maxLoadCapacityKg: 500,
      odometerKm: 18230,
      acquisitionCost: 32000,
      region: "North",
      latitude: 28.6139,
      longitude: 77.2090,
      status: "AVAILABLE",
    },
  });
  const truckEast = await prisma.vehicle.create({
    data: {
      registrationNumber: "TRK-12",
      nameModel: "Volvo FH16",
      type: "TRUCK",
      maxLoadCapacityKg: 12000,
      odometerKm: 84210,
      acquisitionCost: 145000,
      region: "East",
      latitude: 22.5726,
      longitude: 88.3639,
      status: "AVAILABLE",
    },
  });
  const miniWest = await prisma.vehicle.create({
    data: {
      registrationNumber: "MIN-01",
      nameModel: "Tata Ace",
      type: "MINI",
      maxLoadCapacityKg: 750,
      odometerKm: 41200,
      acquisitionCost: 12000,
      region: "West",
      latitude: 19.0760,
      longitude: 72.8777,
      status: "IN_SHOP",
    },
  });
  const truckSouth = await prisma.vehicle.create({
    data: {
      registrationNumber: "TRK-07",
      nameModel: "Scania R500",
      type: "TRUCK",
      maxLoadCapacityKg: 15000,
      odometerKm: 132500,
      acquisitionCost: 160000,
      region: "South",
      latitude: 13.0827,
      longitude: 80.2707,
      status: "RETIRED",
    },
  });
  const vanEast = await prisma.vehicle.create({
    data: {
      registrationNumber: "VAN-09",
      nameModel: "Mercedes Sprinter",
      type: "VAN",
      maxLoadCapacityKg: 900,
      odometerKm: 22400,
      acquisitionCost: 38000,
      region: "East",
      latitude: 22.5726,
      longitude: 88.3639,
      status: "AVAILABLE",
    },
  });

  const alex = await prisma.driver.create({
    data: {
      name: "Alex Morgan",
      licenseNumber: "DL-100234",
      licenseCategory: "LMV",
      licenseExpiryDate: new Date("2027-05-10"),
      contactNumber: "+1-202-555-0142",
      safetyScore: 96,
      status: "AVAILABLE",
    },
  });
  const priya = await prisma.driver.create({
    data: {
      name: "Priya Nair",
      licenseNumber: "DL-100987",
      licenseCategory: "HMV",
      licenseExpiryDate: new Date("2026-09-01"),
      contactNumber: "+1-202-555-0199",
      safetyScore: 91,
      status: "AVAILABLE",
    },
  });
  const carlos = await prisma.driver.create({
    data: {
      name: "Carlos Reyes",
      licenseNumber: "DL-100555",
      licenseCategory: "HMV",
      licenseExpiryDate: new Date("2026-01-15"),
      contactNumber: "+1-202-555-0166",
      safetyScore: 88,
      status: "OFF_DUTY",
    },
  });
  await prisma.driver.create({
    data: {
      name: "Megan Blake",
      licenseNumber: "DL-100777",
      licenseCategory: "LMV",
      licenseExpiryDate: new Date("2025-11-20"),
      contactNumber: "+1-202-555-0111",
      safetyScore: 79,
      status: "SUSPENDED",
    },
  });
  const jordan = await prisma.driver.create({
    data: {
      name: "Jordan Lee",
      licenseNumber: "DL-100333",
      licenseCategory: "LMV",
      licenseExpiryDate: new Date("2027-02-28"),
      contactNumber: "+1-202-555-0177",
      safetyScore: 94,
      status: "AVAILABLE",
    },
  });

  const completedTrip = await prisma.trip.create({
    data: {
      tripCode: "TR001",
      source: "Central Depot",
      destination: "North Warehouse",
      vehicleId: truckEast.id,
      driverId: priya.id,
      cargoWeightKg: 9000,
      plannedDistanceKm: 240,
      status: "COMPLETED",
      dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      finalOdometerKm: 84210,
      fuelConsumedL: 60,
      revenue: 2400,
    },
  });

  await prisma.trip.create({
    data: {
      tripCode: "TR002",
      source: "Central Depot",
      destination: "East Yard",
      vehicleId: vanNorth.id,
      driverId: alex.id,
      cargoWeightKg: 450,
      plannedDistanceKm: 80,
      status: "DRAFT",
    },
  });

  await prisma.trip.create({
    data: {
      tripCode: "TR003",
      source: "East Yard",
      destination: "South Terminal",
      vehicleId: vanEast.id,
      driverId: jordan.id,
      cargoWeightKg: 600,
      plannedDistanceKm: 150,
      status: "DISPATCHED",
      dispatchedAt: new Date(),
    },
  });
  await prisma.vehicle.update({ where: { id: vanEast.id }, data: { status: "ON_TRIP" } });
  await prisma.driver.update({ where: { id: jordan.id }, data: { status: "ON_TRIP" } });

  await prisma.trip.create({
    data: {
      tripCode: "TR004",
      source: "North Warehouse",
      destination: "Central Depot",
      vehicleId: truckSouth.id,
      driverId: carlos.id,
      cargoWeightKg: 5000,
      plannedDistanceKm: 300,
      status: "CANCELLED",
    },
  });

  await prisma.fuelLog.create({
    data: {
      vehicleId: truckEast.id,
      tripId: completedTrip.id,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      liters: 60,
      cost: 90,
    },
  });
  await prisma.fuelLog.create({
    data: {
      vehicleId: vanNorth.id,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      liters: 35,
      cost: 52.5,
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      vehicleId: miniWest.id,
      serviceType: "Oil Change",
      servicerName: "QuickFix Garage",
      cost: 120,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: "ACTIVE",
    },
  });
  await prisma.maintenanceLog.create({
    data: {
      vehicleId: truckEast.id,
      serviceType: "Tyre Replacement",
      servicerName: "Volvo Service Center",
      cost: 800,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      status: "COMPLETED",
    },
  });

  await prisma.expense.create({
    data: {
      vehicleId: truckEast.id,
      tripId: completedTrip.id,
      toll: 45,
      otherMisc: 10,
      total: 55,
      status: "COMPLETED",
    },
  });

  const now = Date.now();
  const hour = 1000 * 60 * 60;
  await prisma.vehiclePosition.createMany({
    data: [
      { vehicleId: vanEast.id, latitude: 22.5726, longitude: 88.3639, speed: 0, heading: 0, recordedAt: new Date(now - hour * 2) },
      { vehicleId: vanEast.id, latitude: 22.5800, longitude: 88.3700, speed: 42, heading: 45, recordedAt: new Date(now - hour * 1.5) },
      { vehicleId: vanEast.id, latitude: 22.5900, longitude: 88.3800, speed: 55, heading: 50, recordedAt: new Date(now - hour) },
      { vehicleId: vanEast.id, latitude: 22.6000, longitude: 88.3950, speed: 60, heading: 48, recordedAt: new Date(now - hour * 0.5) },
      { vehicleId: vanEast.id, latitude: 22.6100, longitude: 88.4100, speed: 48, heading: 42, recordedAt: new Date() },
      { vehicleId: vanNorth.id, latitude: 28.6139, longitude: 77.2090, speed: 0, heading: 0, recordedAt: new Date(now - hour) },
      { vehicleId: vanNorth.id, latitude: 28.6200, longitude: 77.2200, speed: 35, heading: 90, recordedAt: new Date() },
      { vehicleId: truckEast.id, latitude: 22.5726, longitude: 88.3639, speed: 0, heading: 0, recordedAt: new Date(now - hour * 24 * 3) },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
