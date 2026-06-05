"use server";

import { redirect } from "next/navigation";
import { emailSchema, otpCodeSchema } from "@/lib/validation";
import { isWhitelisted } from "@/lib/auth/whitelist";
import { createOtp, verifyOtp, OtpCooldownError } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/auth/email";
import { upsertUserOnLogin } from "@/lib/auth/users";
import { createParticipantSession, clearParticipantSession } from "@/lib/session";

export type LoginState = {
  stage: "email" | "code";
  email: string;
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "");
  const rawCode = formData.get("code");

  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) {
    return { stage: "email", email: rawEmail, error: parsedEmail.error.issues[0].message };
  }
  const email = parsedEmail.data;

  // ── Stage 1: request OTP ──
  if (rawCode == null || String(rawCode).trim() === "") {
    if (!(await isWhitelisted(email))) {
      return { stage: "email", email, error: "อีเมลนี้ไม่อยู่ในรายชื่อผู้มีสิทธิ์เข้าร่วม" };
    }
    const isDev = process.env.NODE_ENV !== "production";
    let code: string;
    try {
      code = await createOtp(email);
    } catch (err) {
      if (err instanceof OtpCooldownError) {
        return { stage: "email", email, error: "ขอรหัสถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
      }
      console.error("createOtp failed:", err);
      return { stage: "email", email, error: "ส่งรหัสไม่สำเร็จ กรุณาลองใหม่" };
    }
    try {
      await sendOtpEmail(email, code);
    } catch (err) {
      console.error("sendOtpEmail failed:", err);
      // In dev, fall back to logging the code so login can be tested even if
      // SMTP isn't configured yet. In production a send failure is a hard error.
      if (isDev) {
        console.log(`\n  🔑 [DEV] OTP for ${email}: ${code}\n`);
      } else {
        return { stage: "email", email, error: "ส่งรหัสไม่สำเร็จ กรุณาลองใหม่" };
      }
    }
    return { stage: "code", email };
  }

  // ── Stage 2: verify OTP ──
  const parsedCode = otpCodeSchema.safeParse(String(rawCode));
  if (!parsedCode.success) {
    return { stage: "code", email, error: parsedCode.error.issues[0].message };
  }
  if (!(await isWhitelisted(email))) {
    return { stage: "email", email, error: "อีเมลนี้ไม่อยู่ในรายชื่อผู้มีสิทธิ์เข้าร่วม" };
  }

  const ok = await verifyOtp(email, parsedCode.data);
  if (!ok) {
    return { stage: "code", email, error: "รหัสไม่ถูกต้องหรือหมดอายุ" };
  }

  const user = await upsertUserOnLogin(email);
  await createParticipantSession({ userId: user.id, email: user.email });
  redirect("/");
}

export async function logoutAction() {
  await clearParticipantSession();
  redirect("/");
}
