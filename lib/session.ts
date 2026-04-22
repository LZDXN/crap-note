import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Payload {
  sub: "admin";
  u: string;
  iat: number;
  exp: number;
}

function secret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(data: string, key: string): string {
  return b64urlEncode(createHmac("sha256", key).update(data).digest());
}

export function issueSessionToken(username: string, now: number = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const payload: Payload = { sub: "admin", u: username, iat: now, exp: now + SESSION_TTL_MS };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(body, key);
  return `${body}.${sig}`;
}

function verifyToken(token: string | undefined): Payload | null {
  if (!token) return null;
  const key = secret();
  if (!key) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let parsed: Payload;
  try {
    parsed = JSON.parse(b64urlDecode(body).toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (parsed.sub !== "admin" || typeof parsed.exp !== "number") return null;
  if (Date.now() >= parsed.exp) return null;
  // If the admin username changed in env, invalidate old tokens.
  const expectedUser = process.env.ADMIN_USERNAME;
  if (expectedUser && parsed.u !== expectedUser) return null;
  return parsed;
}

/** Request-context check for Route Handlers (uses cookies from the incoming request). */
export function isAuthedRequest(req: NextRequest): boolean {
  return verifyToken(req.cookies.get(SESSION_COOKIE)?.value) !== null;
}

/** Server-component / server-action check via next/headers cookies(). */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value) !== null;
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;

  // Constant-time compare for both fields; keep the work even on username
  // mismatch so timing can't reveal whether the user was valid.
  const uA = Buffer.from(username);
  const uB = Buffer.from(expectedUser);
  const pA = Buffer.from(password);
  const pB = Buffer.from(expectedPass);
  const userOk = uA.length === uB.length && timingSafeEqual(uA, uB);
  const passOk = pA.length === pB.length && timingSafeEqual(pA, pB);
  return userOk && passOk;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET,
  );
}
