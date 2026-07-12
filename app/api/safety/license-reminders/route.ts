import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse } from "@/lib/api-guard";

export async function GET(request: NextRequest) {
  const session = withAuth(request, ["SAFETY_OFFICER"]);
  if (isResponse(session)) return session;

  const now = new Date();
  const thirtyDays = new Date(now);
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const expiring = await prisma.driver.findMany({
    where: {
      OR: [
        { licenseExpiryDate: { lt: now } },
        { licenseExpiryDate: { lte: thirtyDays, gte: now } },
      ],
    },
    orderBy: { licenseExpiryDate: "asc" },
  });

  return NextResponse.json({
    stub: true,
    message: `In production, ${expiring.length} email(s) would be sent to drivers with expiring/expired licenses.`,
    drivers: expiring.map((d) => ({
      name: d.name,
      email: d.contactNumber,
      licenseExpiryDate: d.licenseExpiryDate,
      expired: d.licenseExpiryDate < now,
    })),
  });
}
