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

  const attachments = opts.attachment
    ? [
        {
          filename: opts.attachment.filename,
          content: Buffer.from(opts.attachment.content),
          contentType: opts.attachment.mimeType,
        },
      ]
    : [];

  await transporter.sendMail({
    from,
    to: opts.to.join(", "),
    subject: opts.subject,
    html: opts.htmlBody,
    text: opts.textBody,
    attachments,
  });
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

