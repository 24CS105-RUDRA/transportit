import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(_req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 500);

  const positions = await prisma.vehiclePosition.findMany({
    where: { vehicleId: id },
    orderBy: { recordedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ positions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { latitude, longitude, speed, heading } = body;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const position = await prisma.vehiclePosition.create({
    data: {
      vehicleId: id,
      latitude,
      longitude,
      speed: speed ?? null,
      heading: heading ?? null,
    },
  });

  await prisma.vehicle.update({
    where: { id },
    data: { latitude, longitude },
  });

  return NextResponse.json({ position }, { status: 201 });
}
