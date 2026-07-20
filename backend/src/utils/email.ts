import { getEnv } from "./env.ts";
import nodemailer from "npm:nodemailer";
import { Buffer } from "node:buffer";

export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
  mimeType: string;
}

export interface SendEmailOptions {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  attachment?: EmailAttachment;
  attachments?: EmailAttachment[];
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string | null;
  password?: string | null;
  fromAddress: string;
  fromName?: string | null;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    getEnv("SMTP_HOST", "") &&
    getEnv("EMAIL_FROM_ADDRESS", ""),
  );
}

function getSmtpConfig() {
  const host = getEnv("SMTP_HOST");
  const port = parseInt(getEnv("SMTP_PORT", "587") || "587", 10);
  const secure = (getEnv("SMTP_SECURE", "false") || "false").toLowerCase() === "true";
  const user = getEnv("SMTP_USER", "");
  const pass = getEnv("SMTP_PASS", "");
  const fromAddress = getEnv("EMAIL_FROM_ADDRESS");
  const fromName = getEnv("EMAIL_FROM_NAME", "") || "";

  if (!host) throw new Error("SMTP_HOST is not configured.");
  if (!fromAddress) throw new Error("EMAIL_FROM_ADDRESS is not configured.");

  return { host, port, secure, user, pass, fromAddress, fromName };
}

async function sendWithSmtp(
  cfg: { host: string; port: number; secure: boolean; user?: string | null; pass?: string | null; fromAddress: string; fromName?: string | null },
  opts: SendEmailOptions,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    ...(cfg.user && cfg.pass
      ? { auth: { user: cfg.user, pass: cfg.pass } }
      : {}),
  });

  const from = cfg.fromName
    ? `"${cfg.fromName}" <${cfg.fromAddress}>`
    : cfg.fromAddress;

  const normalizedAttachments = [
    ...(opts.attachment ? [opts.attachment] : []),
    ...(opts.attachments ?? []),
  ];

  const attachments = normalizedAttachments.map((attachment) => ({
    filename: attachment.filename,
    content: Buffer.from(attachment.content),
    contentType: attachment.mimeType,
  }));

  const info = await transporter.sendMail({
    from,
    to: opts.to.join(", "),
    subject: opts.subject,
    html: opts.htmlBody,
    text: opts.textBody,
    attachments,
  });

  // Some SMTP servers (notably ones that enforce MAIL FROM / envelope-sender
  // matching against the authenticated user) accept the SMTP session but
  // silently reject the recipients at RCPT TO time. nodemailer does not
  // throw in that case - it resolves with `rejected` populated and
  // `accepted` empty. Without this check the caller believes the email was
  // sent even though nothing was delivered.
  const accepted = Array.isArray(info?.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info?.rejected) ? info.rejected : [];
  if (accepted.length === 0 && opts.to.length > 0) {
    const rejectedList = rejected.length > 0 ? rejected.join(", ") : opts.to.join(", ");
    const response = info?.response ? ` (${info.response})` : "";
    throw new Error(
      `SMTP server rejected all recipients: ${rejectedList}${response}. This often happens when the` +
        ` "From" address does not match or is not authorized for the authenticated SMTP account.`,
    );
  }
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const cfg = getSmtpConfig();
  await sendWithSmtp({ ...cfg, user: cfg.user, pass: cfg.pass }, opts);
}

export async function sendEmailWithConfig(
  config: SmtpConfig,
  opts: SendEmailOptions,
): Promise<void> {
  await sendWithSmtp(
    {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.username,
      pass: config.password,
      fromAddress: config.fromAddress,
      fromName: config.fromName,
    },
    opts,
  );
}

