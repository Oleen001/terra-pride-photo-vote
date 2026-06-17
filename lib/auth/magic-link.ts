import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/validation";
import { isWhitelisted } from "@/lib/auth/whitelist";
import { logLoginAudit } from "@/lib/auth/login-audit";

const DEFAULT_MAGIC_LINK_TTL_DAYS = 30;
const TOKEN_BYTES = 32;

export type MagicLoginResult =
  | { ok: true; email: string }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "revoked" | "not_whitelisted" };

type MagicTokenRow = {
  id: string;
  email: string;
  expires_at: string;
  revoked_at: string | null;
  use_count: number;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function futureDate(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function buildMagicLoginUrl(token: string): string {
  const url = new URL("/magic-login", env.siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function createMagicLoginToken(
  email: string,
  opts?: { expiresAt?: Date; revokeExisting?: boolean },
): Promise<{ email: string; token: string; url: string; expiresAt: string }> {
  const db = supabaseAdmin();
  const normalized = normalizeEmail(email);
  const nowIso = new Date().toISOString();
  const expiresAt = (opts?.expiresAt ?? futureDate(DEFAULT_MAGIC_LINK_TTL_DAYS)).toISOString();

  if (opts?.revokeExisting ?? true) {
    await db
      .from("magic_login_tokens")
      .update({ revoked_at: nowIso })
      .eq("email", normalized)
      .is("revoked_at", null);
  }

  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);

  const { error } = await db.from("magic_login_tokens").insert({
    email: normalized,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (error) throw error;

  await logLoginAudit({
    email: normalized,
    event: "magic_link_created",
    status: "created",
    metadata: { expires_at: expiresAt },
  });

  return { email: normalized, token, url: buildMagicLoginUrl(token), expiresAt };
}

export async function verifyMagicLoginToken(token: string | null): Promise<MagicLoginResult> {
  const cleanToken = token?.trim();
  if (!cleanToken) return { ok: false, reason: "missing" };

  const db = supabaseAdmin();
  const tokenHash = hashToken(cleanToken);
  const now = new Date();

  const { data, error } = await db
    .from("magic_login_tokens")
    .select("id, email, expires_at, revoked_at, use_count")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;

  const row = data as MagicTokenRow | null;
  if (!row) return { ok: false, reason: "invalid" };
  if (row.revoked_at) return { ok: false, reason: "revoked" };
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  const email = normalizeEmail(row.email);
  if (!(await isWhitelisted(email))) {
    return { ok: false, reason: "not_whitelisted" };
  }

  const { error: updateError } = await db
    .from("magic_login_tokens")
    .update({
      last_used_at: now.toISOString(),
      use_count: row.use_count + 1,
    })
    .eq("id", row.id);
  if (updateError) throw updateError;

  return { ok: true, email };
}
