import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, isResponse } from "@/lib/api-guard";
import { sendMail, licenseExpiryEmail } from "@/lib/mail";

export async function GET(request: NextRequest) {
  const session = withAuth(request, ["SAFETY_OFFICER", "SUPER_ADMIN"]);
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

  const results = await Promise.allSettled(
    expiring.map(async (driver) => {
      const daysLeft = Math.ceil(
        (driver.licenseExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const email = licenseExpiryEmail(
        driver.name,
        daysLeft,
        driver.licenseExpiryDate.toLocaleDateString()
      );

      const contactEmail = `${driver.name.toLowerCase().replace(/\s+/g, ".")}@example.com`;

      const result = await sendMail({
        to: contactEmail,
        subject: email.subject,
        html: email.html,
      });

      return {
        driver: driver.name,
        daysLeft,
        expired: daysLeft < 0,
        ...result,
      };
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failed = results.filter((r) => r.status === "rejected");

  return NextResponse.json({
    total: expiring.length,
    sent: sent.length,
    failed: failed.length,
    details: sent,
  });
}
