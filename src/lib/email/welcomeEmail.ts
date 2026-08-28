import nodemailer from "nodemailer";

interface SendWelcomeEmailParams {
  toEmail: string;
  ownerName: string;
  storeName: string;
  storeSlug: string;
  trialEndsAt: Date | null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildPlainText(params: SendWelcomeEmailParams): string {
  const { ownerName, storeName, trialEndsAt } = params;
  return [
    `Welcome to Shei Hoise, ${ownerName}!`,
    "",
    `Your store "${storeName}" is live and ready to go.`,
    trialEndsAt
      ? `Your free trial runs until ${formatDate(trialEndsAt)}.`
      : "",
    "",
    "Log in to your dashboard to finish setting up shipping, payments, and your first products.",
    "",
    "Tip: add this address to your contacts so future order and account emails don't land in spam.",
  ].filter(Boolean).join("\n");
}

function buildEmailHTML(params: SendWelcomeEmailParams): string {
  const { ownerName, storeName, trialEndsAt } = params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const dashboardUrl = `${baseUrl}/dashboard`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Welcome to Shei Hoise</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f3f4f6;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#16a34a;padding:24px 32px;">
              <p style="margin:0;font-size:13px;color:#bbf7d0;letter-spacing:.05em;text-transform:uppercase;">Shei Hoise</p>
              <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Welcome aboard, ${ownerName}!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
                Your store <strong>${storeName}</strong> has been created successfully.
              </p>
              ${trialEndsAt ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">
                You're on a free trial until <strong>${formatDate(trialEndsAt)}</strong>.
              </p>` : ""}
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#16a34a;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Go to your dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                From your dashboard you can finish setting up shipping, payments, and add your first products.
              </p>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                Tip: add this address to your contacts so future order and account emails don't land in spam.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by Shei Hoise</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn("⚠️ Welcome email skipped: GMAIL_USER or GMAIL_APP_PASSWORD not set.");
    return;
  }

  if (!params.toEmail) {
    console.warn("⚠️ Welcome email skipped: no recipient email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Shei Hoise" <${user}>`,
    to: params.toEmail,
    subject: `Welcome to Shei Hoise — ${params.storeName} is live`,
    text: buildPlainText(params),
    html: buildEmailHTML(params),
  });
}
