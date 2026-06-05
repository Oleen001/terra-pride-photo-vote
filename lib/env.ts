import "server-only";

/**
 * Server-side env access. Throws early if a required var is missing so we
 * fail at boot rather than mid-request. Never import this in client code.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export type SmtpAccount = { user: string; pass: string };

function parseSmtpAccounts(): SmtpAccount[] {
  const raw = required("SMTP_ACCOUNTS");
  const accounts = raw
    .split(",")
    .map((entry) => {
      const i = entry.indexOf(":");
      if (i < 0) return null;
      const user = entry.slice(0, i).trim();
      const pass = entry.slice(i + 1).replace(/\s/g, ""); // app passwords often pasted with spaces
      return user && pass ? { user, pass } : null;
    })
    .filter((a): a is SmtpAccount => a !== null);
  if (accounts.length === 0) {
    throw new Error("SMTP_ACCOUNTS must contain at least one 'email:apppassword' pair");
  }
  return accounts;
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  photosBucket: process.env.SUPABASE_PHOTOS_BUCKET ?? "photos",

  smtpHost: required("SMTP_HOST"),
  smtpPort: Number(process.env.SMTP_PORT ?? "587"),
  // One or more sender accounts for failover, format: "email1:apppass1,email2:apppass2".
  // Used in order; on a send failure (e.g. Gmail daily limit) we fall through to the next.
  smtpAccounts: parseSmtpAccounts(),
  mailFromName: process.env.MAIL_FROM_NAME ?? "Terra Pride",

  sessionSecret: required("SESSION_SECRET"),

  adminEmail: required("ADMIN_EMAIL"),
  adminPasswordHash: required("ADMIN_PASSWORD_HASH"),

  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
