import { NextRequest, NextResponse } from "next/server";
import { isAuthedRequest, isConfigured } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    authenticated: isAuthedRequest(req),
    configured: isConfigured(),
  });
}
