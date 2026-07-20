import { getDatabase } from "../database/init.ts";
import { generateUUID } from "../utils/uuid.ts";

export interface EmailConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string | null;
  hasPassword: boolean;
  fromAddress: string;
  fromName: string | null;
  secure: boolean;
  defaultSubject: string | null;
  defaultBody: string | null;
  reminderSubject: string | null;
  reminderBody: string | null;
  /**
   * When true, invoices sent using this configuration display this config's
   * `fromAddress` as the invoice's company email instead of the global
   * Company Information email set in Settings.
   */
  useAsCompanyEmail: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailConfigWithPassword extends EmailConfig {
  password: string | null;
}

function rowToConfig(row: unknown[]): EmailConfig {
  return {
    id: String(row[0]),
    name: String(row[1]),
    host: String(row[2]),
    port: Number(row[3]),
    username: row[4] ? String(row[4]) : null,
    hasPassword: Boolean(row[5]),
    fromAddress: String(row[6]),
    fromName: row[7] ? String(row[7]) : null,
    secure: Boolean(Number(row[8])),
    defaultSubject: row[9] ? String(row[9]) : null,
    defaultBody: row[10] ? String(row[10]) : null,
    reminderSubject: row[11] ? String(row[11]) : null,
    reminderBody: row[12] ? String(row[12]) : null,
    useAsCompanyEmail: Boolean(Number(row[13])),
    createdAt: String(row[14]),
    updatedAt: String(row[15]),
  };
}

function rowToConfigWithPassword(row: unknown[]): EmailConfigWithPassword {
  return {
    id: String(row[0]),
    name: String(row[1]),
    host: String(row[2]),
    port: Number(row[3]),
    username: row[4] ? String(row[4]) : null,
    hasPassword: Boolean(row[5]),
    password: row[5] ? String(row[5]) : null,
    fromAddress: String(row[6]),
    fromName: row[7] ? String(row[7]) : null,
    secure: Boolean(Number(row[8])),
    defaultSubject: row[9] ? String(row[9]) : null,
    defaultBody: row[10] ? String(row[10]) : null,
    reminderSubject: row[11] ? String(row[11]) : null,
    reminderBody: row[12] ? String(row[12]) : null,
    useAsCompanyEmail: Boolean(Number(row[13])),
    createdAt: String(row[14]),
    updatedAt: String(row[15]),
  };
}

const SELECT_COLS =
  "id, name, host, port, username, password, from_address, from_name, secure, default_subject, default_body, reminder_subject, reminder_body, use_as_company_email, created_at, updated_at";

export function listEmailConfigs(): EmailConfig[] {
  const db = getDatabase();
  const rows = db.query(
    `SELECT ${SELECT_COLS} FROM email_configs ORDER BY created_at ASC`,
  ) as unknown[][];
  return rows.map(rowToConfig);
}

export function getEmailConfigById(id: string): EmailConfigWithPassword | null {
  const db = getDatabase();
  const rows = db.query(
    `SELECT ${SELECT_COLS} FROM email_configs WHERE id = ?`,
    [id],
  ) as unknown[][];
  if (rows.length === 0) return null;
  return rowToConfigWithPassword(rows[0]);
}

export function createEmailConfig(data: {
  name: string;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  fromAddress: string;
  fromName?: string | null;
  secure: boolean;
  defaultSubject?: string | null;
  defaultBody?: string | null;
  reminderSubject?: string | null;
  reminderBody?: string | null;
  useAsCompanyEmail?: boolean;
}): EmailConfig {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();
  db.query(
    `INSERT INTO email_configs (id, name, host, port, username, password, from_address, from_name, secure, default_subject, default_body, reminder_subject, reminder_body, use_as_company_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.host,
      data.port,
      data.username || null,
      data.password || null,
      data.fromAddress,
      data.fromName || null,
      data.secure ? 1 : 0,
      data.defaultSubject || null,
      data.defaultBody || null,
      data.reminderSubject || null,
      data.reminderBody || null,
      data.useAsCompanyEmail ? 1 : 0,
      now,
      now,
    ],
  );
  return getEmailConfigById(id)!;
}

export function updateEmailConfig(
  id: string,
  data: {
    name?: string;
    host?: string;
    port?: number;
    username?: string | null;
    password?: string | null; // null = clear, undefined = keep existing, non-empty = update
    fromAddress?: string;
    fromName?: string | null;
    secure?: boolean;
    defaultSubject?: string | null;
    defaultBody?: string | null;
    reminderSubject?: string | null;
    reminderBody?: string | null;
    useAsCompanyEmail?: boolean;
  },
): EmailConfig | null {
  const db = getDatabase();
  const existing = getEmailConfigById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const name = data.name ?? existing.name;
  const host = data.host ?? existing.host;
  const port = data.port ?? existing.port;
  const username = data.username !== undefined ? data.username : existing.username;
  // password: only update if explicitly provided and non-empty
  const password = (data.password !== undefined && data.password !== "")
    ? data.password
    : existing.password;
  const fromAddress = data.fromAddress ?? existing.fromAddress;
  const fromName = data.fromName !== undefined ? data.fromName : existing.fromName;
  const secure = data.secure !== undefined ? data.secure : existing.secure;
  const defaultSubject = data.defaultSubject !== undefined
    ? data.defaultSubject
    : existing.defaultSubject;
  const defaultBody = data.defaultBody !== undefined
    ? data.defaultBody
    : existing.defaultBody;
  const reminderSubject = data.reminderSubject !== undefined
    ? data.reminderSubject
    : existing.reminderSubject;
  const reminderBody = data.reminderBody !== undefined
    ? data.reminderBody
    : existing.reminderBody;
  const useAsCompanyEmail = data.useAsCompanyEmail !== undefined
    ? data.useAsCompanyEmail
    : existing.useAsCompanyEmail;

  db.query(
    `UPDATE email_configs
     SET name = ?, host = ?, port = ?, username = ?, password = ?,
         from_address = ?, from_name = ?, secure = ?,
         default_subject = ?, default_body = ?, reminder_subject = ?, reminder_body = ?,
         use_as_company_email = ?, updated_at = ?
     WHERE id = ?`,
    [
      name,
      host,
      port,
      username,
      password,
      fromAddress,
      fromName,
      secure ? 1 : 0,
      defaultSubject,
      defaultBody,
      reminderSubject,
      reminderBody,
      useAsCompanyEmail ? 1 : 0,
      now,
      id,
    ],
  );
  return getEmailConfigById(id)!;
}

export function deleteEmailConfig(id: string): boolean {
  const db = getDatabase();
  db.query("DELETE FROM email_configs WHERE id = ?", [id]);
  return true;
}
