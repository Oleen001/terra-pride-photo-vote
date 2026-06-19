import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Edge-safe cookie verification. Self-contained because proxy can't use
// next/headers cookies() or server-only modules.
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
const PARTICIPANT_COOKIE = "tp_session";
const ADMIN_COOKIE = "tp_admin";

const authRoutes = new Set(["/login", "/login/success", "/magic-login"]);
const tvRoutes = new Set(["/quiz/live"]);

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

function hasParticipantSession(req: NextRequest): Promise<boolean> {
  return hasValidClaim(
    req.cookies.get(PARTICIPANT_COOKIE)?.value,
    (p) => typeof p.userId === "string",
  );
}

function redirectToLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  const next = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin area ──
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const ok = await hasValidClaim(
      req.cookies.get(ADMIN_COOKIE)?.value,
      (p) => p.admin === true,
    );
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // ── Public auth/TV entry points ──
  if (authRoutes.has(pathname) || tvRoutes.has(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Participant site ──
  if (!pathname.startsWith("/admin") && !(await hasParticipantSession(req))) {
    return redirectToLogin(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|terra-logo-mark.png|terra-logo-full.svg|terra-logo-full-light.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
