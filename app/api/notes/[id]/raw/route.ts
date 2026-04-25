import { NextRequest, NextResponse } from "next/server";
import { getNote, readNoteContent } from "@/lib/storage";
import { contentDispositionHeader, effectiveVisibility, mimeForKind } from "@/lib/types";
import { isAuthedRequest, isConfigured } from "@/lib/session";
import { consumeRate, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAW_LIMIT = 60;
const RAW_WINDOW_MS = 60_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(req);
  const gate = consumeRate(`raw:${ip}`, RAW_LIMIT, RAW_WINDOW_MS);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  const { id } = await params;
  const note = await getNote(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    effectiveVisibility(note) === "private" &&
    isConfigured() &&
    !isAuthedRequest(req)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";

  const data = await readNoteContent(note);
  const mime = note.mimeType || mimeForKind(note.kind);

  const headers = new Headers({
    "Content-Type": mime,
    "Content-Length": String(data.byteLength),
    "Cache-Control": "private, max-age=0, must-revalidate",
    "Content-Disposition": contentDispositionHeader(note.originalName, download),
  });

  return new NextResponse(new Uint8Array(data), { status: 200, headers });
}
