import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse, handleApiError } from "@/lib/api-guard";

const expenseSchema = z.object({
  vehicleId: z.string().min(1),
  tripId: z.string().optional(),
  toll: z.number().min(0).default(0),
  otherMisc: z.number().min(0).default(0),
  status: z.enum(["PENDING", "COMPLETED"]).default("PENDING"),
});

export async function GET(request: NextRequest) {
  const session = withAuth(request, null);
  if (isResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get("vehicleId");

  const expenses = await prisma.expense.findMany({
    where: vehicleId ? { vehicleId } : {},
    include: { vehicle: true, trip: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ expenses });
}

export async function POST(request: NextRequest) {
  const session = withAuth(request, ["FINANCIAL_ANALYST"]);
  if (isResponse(session)) return session;

  try {
    const body = await request.json();
    const parsed = expenseSchema.parse(body);
    const total = parsed.toll + parsed.otherMisc;
    const expense = await prisma.expense.create({
      data: {
        vehicleId: parsed.vehicleId,
        tripId: parsed.tripId,
        toll: parsed.toll,
        otherMisc: parsed.otherMisc,
        total,
        status: parsed.status,
      },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
