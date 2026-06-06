"use server";

import { redirect } from "next/navigation";
import { emailSchema } from "@/lib/validation";
import { verifyAdminCredentials } from "@/lib/auth/admin";
import { createAdminSession, clearAdminSession } from "@/lib/session";

export type AdminLoginState = { error?: string; email: string };

// In-memory brute-force limiter, keyed by normalized email. This is sufficient
// for a single-instance event app; it does NOT survive a restart and is NOT
// shared across processes/instances. Move to a shared store (Redis/DB) if this
// ever runs multi-instance.
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const attempts = new Map<string, { count: number; firstAt: number }>();

function isRateLimited(email: string): boolean {
  const rec = attempts.get(email);
  if (!rec) return false;
  if (Date.now() - rec.firstAt > WINDOW_MS) {
    attempts.delete(email); // window expired — start fresh
    return false;
  }
  return rec.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailure(email: string): void {
  const rec = attempts.get(email);
  if (!rec || Date.now() - rec.firstAt > WINDOW_MS) {
    attempts.set(email, { count: 1, firstAt: Date.now() });
    return;
  }
  rec.count += 1;
}

export async function adminLoginAction(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const rawEmail = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success || !password) {
    return { email: rawEmail, error: "Please enter your email and password." };
  }

  // emailSchema already trims+lowercases, so parsed.data is the normalized key.
  const key = parsed.data;
  if (isRateLimited(key)) {
    return { email: rawEmail, error: "Too many attempts, try again later." };
  }

  const ok = await verifyAdminCredentials(parsed.data, password);
  if (!ok) {
    recordFailure(key);
    return { email: rawEmail, error: "Incorrect email or password." };
  }

  attempts.delete(key); // reset the counter on a successful login
  await createAdminSession(parsed.data);
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
