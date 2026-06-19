"use server";

import { redirect } from "next/navigation";
import { emailSchema } from "@/lib/validation";
import { isWhitelisted } from "@/lib/auth/whitelist";
import { logLoginAudit } from "@/lib/auth/login-audit";
import { upsertUserOnLogin } from "@/lib/auth/users";
import { createParticipantSession, clearParticipantSession } from "@/lib/session";
import { safeLoginNextPath } from "@/lib/auth/next-path";

export type LoginState = {
  email: string;
  next: string;
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "");
  const next = safeLoginNextPath(formData.get("next"));

  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) {
    return { email: rawEmail, next, error: parsedEmail.error.issues[0].message };
  }
  const email = parsedEmail.data;

  if (!(await isWhitelisted(email))) {
    return { email, next, error: "This email isn't on the guest list." };
  }

  const user = await upsertUserOnLogin(email);
  await createParticipantSession({ userId: user.id, email: user.email });
  await logLoginAudit({
    email: user.email,
    event: "login_success",
    status: "success",
    metadata: { method: "email_only" },
  });
  redirect(next);
}

export async function logoutAction() {
  await clearParticipantSession();
  redirect("/");
}
