import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Edge-safe cookie verification. Self-contained because proxy can't use
// next/headers cookies() or server-only modules.
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

async function hasValidClaim(
  token: string | undefined,
  check: (p: Record<string, unknown>) => boolean,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return check(payload);
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin area ──
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const ok = await hasValidClaim(
      req.cookies.get("tp_admin")?.value,
      (p) => p.admin === true,
    );
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // ── Participant-only routes ──
  if (pathname === "/upload") {
    const ok = await hasValidClaim(
      req.cookies.get("tp_session")?.value,
      (p) => typeof p.userId === "string",
    );
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/upload"],
};
