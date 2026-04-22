import { NextRequest, NextResponse } from "next/server";
import { getNote, readNoteContent } from "@/lib/storage";
import { mimeForKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";

  const data = await readNoteContent(note);
  const mime = note.mimeType || mimeForKind(note.kind);

  const headers = new Headers({
    "Content-Type": mime,
    "Content-Length": String(data.byteLength),
    "Cache-Control": "private, max-age=0, must-revalidate",
  });
  if (download) {
    const safe = note.originalName.replace(/"/g, "");
    headers.set("Content-Disposition", `attachment; filename="${safe}"`);
  } else {
    headers.set("Content-Disposition", "inline");
  }

  return new NextResponse(new Uint8Array(data), { status: 200, headers });
}
