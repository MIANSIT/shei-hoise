import nodemailer from "nodemailer";

interface SendVerificationCodeEmailParams {
  toEmail: string;
  code: string;
}

function buildPlainText({ code }: SendVerificationCodeEmailParams): string {
  return [
    "Verify your email",
    "",
    "Use this code to finish creating your Shei Hoise store:",
    code,
    "",
    "This code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.",
  ].join("\n");
}

function buildEmailHTML({ code }: SendVerificationCodeEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Verify your email</title>
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
              <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Verify your email</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">
                Use this code to finish creating your Shei Hoise store. It's valid for <strong>10 minutes</strong>.
              </p>
              <div style="margin:0 0 20px;text-align:center;">
                <span style="display:inline-block;padding:16px 28px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:32px;font-weight:700;letter-spacing:.3em;color:#16a34a;">
                  ${code}
                </span>
              </div>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                If you didn't request this, you can safely ignore this email — no account will be created.
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

export async function sendVerificationCodeEmail(
  params: SendVerificationCodeEmailParams
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Verification email cannot be sent: GMAIL_USER or GMAIL_APP_PASSWORD not set."
    );
  }

  if (!params.toEmail) {
    throw new Error("Verification email cannot be sent: no recipient email.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Shei Hoise" <${user}>`,
    to: params.toEmail,
    subject: `${params.code} is your Shei Hoise verification code`,
    text: buildPlainText(params),
    html: buildEmailHTML(params),
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      "Importance": "High",
    },
  });
}
