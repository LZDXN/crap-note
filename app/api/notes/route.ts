import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createNote, listNotes } from "@/lib/storage";
import { effectiveVisibility, MAX_UPLOAD_BYTES, sanitizeFilename } from "@/lib/types";
import { isAuthedRequest, isConfigured } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const notes = await listNotes();
  const showAll = !isConfigured() || isAuthedRequest(req);
  const visible = showAll
    ? notes
    : notes.filter((n) => effectiveVisibility(n) === "public");
  return NextResponse.json({ notes: visible });
}

export async function POST(req: NextRequest) {
  // Admin-only. If auth isn't configured at all (legacy/local dev), uploads stay open
  // so the tool remains usable; once credentials are set, only signed-in admins pass.
  if (isConfigured() && !isAuthedRequest(req)) {
    return NextResponse.json(
      { error: "Uploads are admin-only. Sign in at /admin/login." },
      { status: 401 },
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data upload." },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Malformed form data." }, { status: 400 });
  }

  const file = form.get("file");
  const title = (form.get("title") as string | null) ?? undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  const existing = await listNotes();
  const duplicate = existing.find((n) => n.contentHash === contentHash);
  if (duplicate) {
    return NextResponse.json(
      {
        error: `Already uploaded as “${duplicate.title}”.`,
        existing: duplicate,
      },
      { status: 409 },
    );
  }

  try {
    const note = await createNote({
      originalName: sanitizeFilename(file.name),
      mimeType: file.type,
      title,
      data: buffer,
      contentHash,
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
