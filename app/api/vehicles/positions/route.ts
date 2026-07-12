import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      status: { notIn: ["RETIRED"] },
    },
    select: {
      id: true,
      registrationNumber: true,
      nameModel: true,
      type: true,
      status: true,
      region: true,
      latitude: true,
      longitude: true,
    },
  });

  const vehicleIds = vehicles.map((v) => v.id);

  const latestPositions = await prisma.vehiclePosition.findMany({
    where: { vehicleId: { in: vehicleIds } },
    orderBy: { recordedAt: "desc" },
    distinct: ["vehicleId"],
    select: {
      vehicleId: true,
      latitude: true,
      longitude: true,
      speed: true,
      heading: true,
      recordedAt: true,
    },
  });

  const posMap = new Map(latestPositions.map((p) => [p.vehicleId, p]));

  const result = vehicles.map((v) => {
    const pos = posMap.get(v.id);
    return {
      ...v,
      latitude: pos?.latitude ?? v.latitude,
      longitude: pos?.longitude ?? v.longitude,
      speed: pos?.speed ?? null,
      heading: pos?.heading ?? null,
      lastSeen: pos?.recordedAt ?? null,
    };
  });

  return NextResponse.json({ vehicles: result });
}
