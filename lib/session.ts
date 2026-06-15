import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const secret = new TextEncoder().encode(env.sessionSecret);
const ALG = "HS256";

const PARTICIPANT_COOKIE = "tp_session";
const ADMIN_COOKIE = "tp_admin";
const PARTICIPANT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ADMIN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type ParticipantSession = { userId: string; email: string };
export type AdminSession = { admin: true; email: string };

async function sign(payload: Record<string, unknown>, maxAge: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret);
}

async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    return payload as T;
  } catch {
    return null;
  }
}

const baseCookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const participantCookieOpts = { ...baseCookieOpts, maxAge: PARTICIPANT_MAX_AGE };

// Admin cookie is stricter — no cross-site sending at all.
const adminCookieOpts = { ...baseCookieOpts, sameSite: "strict" as const, maxAge: ADMIN_MAX_AGE };

// ── Participant ────────────────────────────────────────────────
export async function createParticipantSession(s: ParticipantSession) {
  const token = await sign({ ...s }, PARTICIPANT_MAX_AGE);
  (await cookies()).set(PARTICIPANT_COOKIE, token, participantCookieOpts);
}

export async function getParticipantSession(): Promise<ParticipantSession | null> {
  const token = (await cookies()).get(PARTICIPANT_COOKIE)?.value;
  const payload = await verify<ParticipantSession>(token);
  if (!payload?.userId || !payload?.email) return null;
  return { userId: payload.userId, email: payload.email };
}

export async function clearParticipantSession() {
  (await cookies()).delete(PARTICIPANT_COOKIE);
}

// ── Admin ──────────────────────────────────────────────────────
export async function createAdminSession(email: string) {
  const token = await sign({ admin: true, email }, ADMIN_MAX_AGE);
  (await cookies()).set(ADMIN_COOKIE, token, adminCookieOpts);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const payload = await verify<AdminSession>(token);
  if (!payload?.admin) return null;
  return { admin: true, email: payload.email };
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
