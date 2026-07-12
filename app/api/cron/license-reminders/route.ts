import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, licenseExpiryEmail } from "@/lib/mail";

// GET /api/cron/license-reminders
// Call this from an external cron service (e.g., cron-job.org) daily at 9 AM
// Or it auto-triggers when Safety Officer opens /safety page

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (expiring.length === 0) {
    return NextResponse.json({ total: 0, sent: 0, message: "No expiring licenses found." });
  }

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
