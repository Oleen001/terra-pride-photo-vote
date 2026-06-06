"use server";

import { redirect } from "next/navigation";
import { emailSchema } from "@/lib/validation";
import { verifyAdminCredentials } from "@/lib/auth/admin";
import { createAdminSession, clearAdminSession } from "@/lib/session";

export type AdminLoginState = { error?: string; email: string };

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

  const ok = await verifyAdminCredentials(parsed.data, password);
  if (!ok) {
    return { email: rawEmail, error: "Incorrect email or password." };
  }

  await createAdminSession(parsed.data);
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
