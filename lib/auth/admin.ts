import "server-only";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/validation";

/** Validate admin credentials against env config. */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  if (normalizeEmail(email) !== normalizeEmail(env.adminEmail)) return false;
  return bcrypt.compare(password, env.adminPasswordHash);
}
