import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/validation";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const BCRYPT_COST = 10;
const RESEND_COOLDOWN_MS = 60 * 1000; // min gap between OTP requests per email
const MAX_FAILED_ATTEMPTS = 5; // lock an OTP after this many wrong tries

/** Thrown by createOtp when an email requests codes too quickly. */
export class OtpCooldownError extends Error {
  constructor() {
    super("OTP_COOLDOWN");
    this.name = "OtpCooldownError";
  }
}

/** Generate a 6-digit numeric code (cryptographically random). */
function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Create an OTP for an email: invalidate any previous unused codes, store a
 * new hashed code, and return the plaintext code so the caller can email it.
 */
export async function createOtp(email: string): Promise<string> {
  const db = supabaseAdmin();
  const normalized = normalizeEmail(email);
  const now = new Date();

  // Rate-limit: reject if an *unused* code was issued for this email very
  // recently. We scope to used_at IS NULL so a code that was already consumed
  // by a successful login doesn't block a legitimate immediate re-request.
  const { data: recent } = await db
    .from("otp_codes")
    .select("created_at")
    .eq("email", normalized)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && now.getTime() - new Date(recent.created_at).getTime() < RESEND_COOLDOWN_MS) {
    throw new OtpCooldownError();
  }

  // Invalidate previous active codes so only the latest one works.
  await db
    .from("otp_codes")
    .update({ used_at: now.toISOString() })
    .eq("email", normalized)
    .is("used_at", null);

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_COST);
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS).toISOString();

  const { error } = await db.from("otp_codes").insert({
    email: normalized,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  if (error) throw error;

  return code;
}

/**
 * Verify a submitted code against the latest active OTP for the email.
 * On success the code is marked used (single-use). Returns true/false.
 */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const db = supabaseAdmin();
  const normalized = normalizeEmail(email);
  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from("otp_codes")
    .select("id, code_hash, failed_attempts")
    .eq("email", normalized)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;

  // Brute-force cap: a code locked after too many wrong tries is dead.
  if (data.failed_attempts >= MAX_FAILED_ATTEMPTS) return false;

  const ok = await bcrypt.compare(code, data.code_hash);
  if (!ok) {
    await db
      .from("otp_codes")
      .update({ failed_attempts: data.failed_attempts + 1 })
      .eq("id", data.id);
    return false;
  }

  // Single-use: burn it.
  await db.from("otp_codes").update({ used_at: nowIso }).eq("id", data.id);
  return true;
}
