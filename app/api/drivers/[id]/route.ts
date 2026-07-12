import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";
import { logAudit, setAuditActor } from "@/lib/rules";

const driverUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  licenseCategory: z.enum(["LMV", "HMV", "OTHER"]).optional(),
  licenseExpiryDate: z.string().min(1).optional(),
  contactNumber: z.string().min(1).optional(),
  safetyScore: z.number().min(0).max(100).optional(),
  status: z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/drivers/[id]">) {
  const session = withAuth(request, ["SAFETY_OFFICER"]);
  if (isResponse(session)) return session;
  setAuditActor(session.email);

  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const parsed = driverUpdateSchema.parse(body);
    const data = {
      ...parsed,
      ...(parsed.licenseExpiryDate ? { licenseExpiryDate: new Date(parsed.licenseExpiryDate) } : {}),
    };
    const before = await prisma.driver.findUnique({ where: { id }, select: { status: true } });
    const driver = await prisma.driver.update({ where: { id }, data });
    if (data.status && before && before.status !== data.status) {
      await logAudit("DRIVER", id, "STATUS_CHANGE", before.status, data.status);
    }
    return NextResponse.json({ driver });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/drivers/[id]">) {
  const session = withAuth(request, ["SAFETY_OFFICER"]);
  if (isResponse(session)) return session;

  try {
    const { id } = await ctx.params;
    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
