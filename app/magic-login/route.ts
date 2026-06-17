import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLoginToken } from "@/lib/auth/magic-link";
import { upsertUserOnLogin } from "@/lib/auth/users";
import { createParticipantSession } from "@/lib/session";
import { logLoginAudit } from "@/lib/auth/login-audit";
import { safeLoginNextPath } from "@/lib/auth/next-path";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const next = safeLoginNextPath(request.nextUrl.searchParams.get("next"));
  const result = await verifyMagicLoginToken(token);

  if (!result.ok) {
    await logLoginAudit({
      event: "magic_link_failed",
      status: "failed",
      metadata: { reason: result.reason },
    });

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("magic", result.reason);
    return NextResponse.redirect(loginUrl);
  }

  const user = await upsertUserOnLogin(result.email);
  await createParticipantSession({ userId: user.id, email: user.email });
  await logLoginAudit({
    email: result.email,
    event: "magic_link_used",
    status: "success",
  });
  await logLoginAudit({
    email: result.email,
    event: "login_success",
    status: "success",
    metadata: { method: "magic_link" },
  });

  const successUrl = new URL("/login/success", request.url);
  successUrl.searchParams.set("next", next);
  return NextResponse.redirect(successUrl);
}
