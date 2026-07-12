import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/vehicles/[id]">
) {
  const session = withAuth(request, null);
  if (isResponse(session)) return session;

  try {
    const { id } = await ctx.params;
    const docs = await prisma.vehicleDocument.findMany({
      where: { vehicleId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ documents: docs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/vehicles/[id]">
) {
  const session = withAuth(request, ["FLEET_MANAGER"]);
  if (isResponse(session)) return session;

  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId: id,
        name: body.name,
        type: body.type,
        url: body.url || null,
        uploadedBy: session.email,
      },
    });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
