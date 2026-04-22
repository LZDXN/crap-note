import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  isConfigured,
  issueSessionToken,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/session";
import { clientIp, consumeRate } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          "Admin auth is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const gate = consumeRate(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password || !verifyCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = issueSessionToken(username);
  if (!token) {
    return NextResponse.json({ error: "Session secret not set." }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
