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
    return { email: rawEmail, error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

  const ok = await verifyAdminCredentials(parsed.data, password);
  if (!ok) {
    return { email: rawEmail, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  await createAdminSession(parsed.data);
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
