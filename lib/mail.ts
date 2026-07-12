import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendMail({ to, subject, html }: SendMailOptions) {
  if (!process.env.SMTP_USER) {
    console.warn("[Email] SMTP_USER not set — skipping email send");
    return { skipped: true, to, subject };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"TransitOps" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  return { messageId: info.messageId, to, subject };
}

export function licenseExpiryEmail(driverName: string, daysLeft: number, expiryDate: string) {
  const isExpired = daysLeft < 0;
  const status = isExpired ? "EXPIRED" : `expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
  const urgency = isExpired ? "#dc2626" : "#d97706";

  return {
    subject: isExpired
      ? `URGENT: Your driving license has EXPIRED — TransitOps`
      : `Reminder: Your driving license ${status} — TransitOps`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <div style="background: ${urgency}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">TransitOps — License Reminder</h2>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151;">Hi <strong>${driverName}</strong>,</p>
          <p style="font-size: 15px; color: #6b7280; line-height: 1.6;">
            This is a reminder that your driving license has <span style="color: ${urgency}; font-weight: bold;">${status}</span>.
          </p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Expiry Date: <strong style="color: #111827;">${expiryDate}</strong></p>
            <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Status: <strong style="color: ${urgency};">${isExpired ? "EXPIRED" : "EXPIRING SOON"}</strong></p>
          </div>
          <p style="font-size: 14px; color: #9ca3af; line-height: 1.5;">
            Please renew your license immediately and update it in the TransitOps system to avoid being blocked from trip assignments.
          </p>
          <p style="font-size: 14px; color: #9ca3af;">— TransitOps Safety Team</p>
        </div>
      </div>
    `,
  };
}
