import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLoginToken } from "@/lib/auth/magic-link";
import { upsertUserOnLogin } from "@/lib/auth/users";
import { createParticipantSession } from "@/lib/session";
import { logLoginAudit } from "@/lib/auth/login-audit";
import { safeLoginNextPath } from "@/lib/auth/next-path";

function isLocalhost(host: string): boolean {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host === "::1";
}

function publicUrl(request: NextRequest, pathname: string): URL {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) {
    const configured = new URL(configuredSiteUrl);
    if (!isLocalhost(configured.hostname)) return new URL(pathname, configured);
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost && !isLocalhost(forwardedHost)) {
    const forwardedProto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return new URL(pathname, `${forwardedProto}://${forwardedHost}`);
  }

  return new URL(pathname, request.nextUrl.origin);
}

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

    const loginUrl = publicUrl(request, "/login");
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

  const successUrl = publicUrl(request, "/login/success");
  successUrl.searchParams.set("next", next);
  return NextResponse.redirect(successUrl);
}
