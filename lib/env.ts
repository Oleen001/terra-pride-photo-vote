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

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  photosBucket: process.env.SUPABASE_PHOTOS_BUCKET ?? "photos",

  // Email via Brevo HTTP API (port 443) — PaaS hosts block outbound SMTP.
  brevoApiKey: required("BREVO_API_KEY"),
  mailFromEmail: required("MAIL_FROM_EMAIL"), // must be a verified sender in Brevo
  mailFromName: process.env.MAIL_FROM_NAME ?? "Terra Pride",

  sessionSecret: required("SESSION_SECRET"),

  adminEmail: required("ADMIN_EMAIL"),
  adminPasswordHash: required("ADMIN_PASSWORD_HASH"),

  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
