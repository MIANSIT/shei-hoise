import nodemailer from "nodemailer";

interface SendPasswordResetEmailParams {
  toEmail: string;
  resetUrl: string;
}

function buildPlainText({ resetUrl }: SendPasswordResetEmailParams): string {
  return [
    "Reset your password",
    "",
    "We received a request to reset your password. This link is valid for 1 hour:",
    resetUrl,
    "",
    "If you didn't request this, you can safely ignore this email.",
  ].join("\n");
}

function buildEmailHTML({ resetUrl }: SendPasswordResetEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Reset your password</title>
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
              <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Reset your password</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">
                We received a request to reset your password. Click the button below to choose a new one.
                This link is valid for <strong>1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#16a34a;">
                    <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
                Or copy and paste this link into your browser:<br/>
                <a href="${resetUrl}" style="color:#16a34a;word-break:break-all;">${resetUrl}</a>
              </p>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                If you didn't request this, you can safely ignore this email — your password won't change.
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

export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn(
      "⚠️ Password reset email skipped: GMAIL_USER or GMAIL_APP_PASSWORD not set."
    );
    return;
  }

  if (!params.toEmail) {
    console.warn("⚠️ Password reset email skipped: no recipient email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Shei Hoise" <${user}>`,
    to: params.toEmail,
    subject: "Reset your Shei Hoise password",
    text: buildPlainText(params),
    html: buildEmailHTML(params),
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      "Importance": "High",
    },
  });
}
