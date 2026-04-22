import { NextRequest, NextResponse } from "next/server";
import { deleteNote, getNote, updateNoteTitle } from "@/lib/storage";
import { isAuthedRequest, isConfigured } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mutation gate mirrors uploads: when admin auth is configured, only admins
// can edit or delete. Legacy/local deployments (no env vars) stay open.
function requireAdmin(req: NextRequest): NextResponse | null {
  if (!isConfigured()) return null;
  if (isAuthedRequest(req)) return null;
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  const note = await updateNoteTitle(id, body.title);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const removed = await deleteNote(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
