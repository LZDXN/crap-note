import { del, get, put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { kindFromName, mimeForKind, type NoteKind, type NoteRecord, type NoteVisibility } from "../types";

const INDEX_KEY = "notes/index.json";

async function loadIndex(): Promise<NoteRecord[]> {
  const result = await get(INDEX_KEY, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return [];
  const text = await new Response(result.stream).text();
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? (parsed as NoteRecord[]) : [];
}

async function saveIndex(records: NoteRecord[]) {
  await put(INDEX_KEY, JSON.stringify(records, null, 2), {
    access: "private",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

function slugify(input: string): string {
  return input
    .replace(/\.(md|markdown|html?|pdf)$/i, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60) || "note";
}

export async function listNotes(): Promise<NoteRecord[]> {
  const notes = await loadIndex();
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getNote(id: string): Promise<NoteRecord | null> {
  const notes = await loadIndex();
  return notes.find((n) => n.id === id) ?? null;
}

export async function readNoteContent(note: NoteRecord): Promise<Buffer> {
  const pathname = note.blobPathname;
  if (!pathname) throw new Error(`Note ${note.id} has no blob pathname.`);
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw new Error(`Failed to fetch blob for ${note.id}.`);
  }
  const arr = await new Response(result.stream).arrayBuffer();
  return Buffer.from(arr);
}

export async function createNote(opts: {
  originalName: string;
  mimeType: string;
  title?: string;
  data: Buffer;
  contentHash?: string;
  visibility?: NoteVisibility;
}): Promise<NoteRecord> {
  const detected = kindFromName(opts.originalName, opts.mimeType);
  if (!detected) {
    throw new Error(
      `Unsupported file type. Upload .md, .markdown, .html, .htm, or .pdf (got "${opts.originalName}").`,
    );
  }
  const kind: NoteKind = detected;
  const id = nanoid(10);
  const now = new Date().toISOString();
  const ext = kind === "markdown" ? ".md" : kind === "html" ? ".html" : ".pdf";
  const storedFileName = `${id}${ext}`;
  const title = (opts.title?.trim() || opts.originalName.replace(/\.[^.]+$/, "")).slice(0, 200);
  const slug = slugify(title);
  const mime = opts.mimeType || mimeForKind(kind);

  const blob = await put(`notes/files/${storedFileName}`, opts.data, {
    access: "private",
    contentType: mime,
    addRandomSuffix: true,
  });

  const record: NoteRecord = {
    id,
    slug,
    title,
    kind,
    originalName: opts.originalName,
    storedFileName,
    mimeType: mime,
    size: opts.data.byteLength,
    createdAt: now,
    updatedAt: now,
    contentHash: opts.contentHash,
    blobUrl: blob.url,
    blobPathname: blob.pathname,
    visibility: opts.visibility ?? "private",
  };

  const notes = await loadIndex();
  notes.push(record);
  await saveIndex(notes);
  return record;
}

export async function deleteNote(id: string): Promise<boolean> {
  const notes = await loadIndex();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  const [removed] = notes.splice(idx, 1);
  if (removed.blobUrl) {
    try {
      await del(removed.blobUrl);
    } catch (err) {
      console.warn(`Failed to delete blob for ${removed.id}:`, err);
    }
  }
  await saveIndex(notes);
  return true;
}

export async function updateNoteTitle(id: string, title: string): Promise<NoteRecord | null> {
  const notes = await loadIndex();
  const note = notes.find((n) => n.id === id);
  if (!note) return null;
  const clean = title.trim().slice(0, 200);
  if (!clean) return note;
  note.title = clean;
  note.slug = slugify(clean);
  note.updatedAt = new Date().toISOString();
  await saveIndex(notes);
  return note;
}

export async function updateNoteVisibility(
  id: string,
  visibility: NoteVisibility,
): Promise<NoteRecord | null> {
  const notes = await loadIndex();
  const note = notes.find((n) => n.id === id);
  if (!note) return null;
  note.visibility = visibility;
  note.updatedAt = new Date().toISOString();
  await saveIndex(notes);
  return note;
}
