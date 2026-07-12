import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse } from "@/lib/api-guard";

export async function GET(request: NextRequest) {
  const session = withAuth(request, ["FLEET_MANAGER", "DISPATCHER"]);
  if (isResponse(session)) return session;

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ logs });
}
