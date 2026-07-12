import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";

const settingsSchema = z.object({
  depotName: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  distanceUnit: z.string().min(1).optional(),
  rolePermissions: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = withAuth(request, null);
  if (isResponse(session)) return session;

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    return NextResponse.json({ settings: null }, { status: 404 });
  }
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const session = withAuth(request, ["SUPER_ADMIN", "FLEET_MANAGER"]);
  if (isResponse(session)) return session;

  try {
    const body = await request.json();
    const parsed = settingsSchema.parse(body);

    const existing = await prisma.settings.findFirst();
    if (!existing) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    const updated = await prisma.settings.update({
      where: { id: existing.id },
      data: {
        ...(parsed.depotName !== undefined ? { depotName: parsed.depotName } : {}),
        ...(parsed.currency !== undefined ? { currency: parsed.currency } : {}),
        ...(parsed.distanceUnit !== undefined
          ? { distanceUnit: parsed.distanceUnit }
          : {}),
        ...(parsed.rolePermissions !== undefined
          ? { rolePermissions: parsed.rolePermissions }
          : {}),
      },
    });
    return NextResponse.json({ settings: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
