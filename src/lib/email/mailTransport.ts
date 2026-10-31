import nodemailer, { type Transporter } from "nodemailer";

/** How a mail goes out: the transport that carries it, and the address it is sent from. */
export interface MailSender {
  transporter: Transporter;
  /** The address behind the store's name in the "From" line. */
  fromAddress: string;
  kind: "smtp" | "gmail";
}

/**
 * The sender for membership emails.
 *
 * 1. A mail service (Resend, Brevo, Amazon SES, Mailgun... all offer SMTP), when these server
 *    settings exist: MAIL_SMTP_HOST, MAIL_SMTP_USER, MAIL_SMTP_PASS, MAIL_FROM_ADDRESS
 *    (and optionally MAIL_SMTP_PORT, default 465). MAIL_FROM_ADDRESS must be an address on a
 *    domain the service has verified, e.g. membership@mail.sheihoise.com.
 * 2. Otherwise the platform's Gmail account (GMAIL_USER / GMAIL_APP_PASSWORD), as the platform's
 *    other emails use.
 * @returns null when neither is set up
 */
export function getMailSender(): MailSender | null {
  const host = process.env.MAIL_SMTP_HOST;
  const user = process.env.MAIL_SMTP_USER;
  const pass = process.env.MAIL_SMTP_PASS;
  const from = process.env.MAIL_FROM_ADDRESS;
  if (host && user && pass && from) {
    const port = Number(process.env.MAIL_SMTP_PORT) || 465;
    return {
      transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }),
      fromAddress: from,
      kind: "smtp",
    };
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return {
      transporter: nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } }),
      fromAddress: gmailUser,
      kind: "gmail",
    };
  }
  return null;
}
