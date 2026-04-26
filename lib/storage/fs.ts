import { promises as fs } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { kindFromName, mimeForKind, type NoteKind, type NoteRecord, type NoteVisibility } from "../types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILES_DIR = path.join(DATA_DIR, "files");
const DB_FILE = path.join(DATA_DIR, "notes.json");

async function ensureDirs() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

async function readDb(): Promise<NoteRecord[]> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as NoteRecord[];
    return [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeDb(records: NoteRecord[]) {
  await ensureDirs();
  const tmp = DB_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(records, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
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
  const notes = await readDb();
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getNote(id: string): Promise<NoteRecord | null> {
  const notes = await readDb();
  return notes.find((n) => n.id === id) ?? null;
}

export async function readNoteContent(note: NoteRecord): Promise<Buffer> {
  const filePath = path.join(FILES_DIR, note.storedFileName);
  return fs.readFile(filePath);
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
  const ext =
    kind === "markdown" ? ".md" : kind === "html" ? ".html" : ".pdf";
  const storedFileName = `${id}${ext}`;
  const title = (opts.title?.trim() || opts.originalName.replace(/\.[^.]+$/, "")).slice(0, 200);
  const slug = slugify(title);

  await ensureDirs();
  await fs.writeFile(path.join(FILES_DIR, storedFileName), opts.data);

  const record: NoteRecord = {
    id,
    slug,
    title,
    kind,
    originalName: opts.originalName,
    storedFileName,
    mimeType: opts.mimeType || mimeForKind(kind),
    size: opts.data.byteLength,
    createdAt: now,
    updatedAt: now,
    contentHash: opts.contentHash,
    visibility: opts.visibility ?? "private",
  };

  const notes = await readDb();
  notes.push(record);
  await writeDb(notes);
  return record;
}

export async function deleteNote(id: string): Promise<boolean> {
  const notes = await readDb();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  const [removed] = notes.splice(idx, 1);
  try {
    await fs.unlink(path.join(FILES_DIR, removed.storedFileName));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  await writeDb(notes);
  return true;
}

export async function updateNoteTitle(id: string, title: string): Promise<NoteRecord | null> {
  const notes = await readDb();
  const note = notes.find((n) => n.id === id);
  if (!note) return null;
  const clean = title.trim().slice(0, 200);
  if (!clean) return note;
  note.title = clean;
  note.slug = slugify(clean);
  note.updatedAt = new Date().toISOString();
  await writeDb(notes);
  return note;
}

export async function updateNoteVisibility(
  id: string,
  visibility: NoteVisibility,
): Promise<NoteRecord | null> {
  const notes = await readDb();
  const note = notes.find((n) => n.id === id);
  if (!note) return null;
  note.visibility = visibility;
  note.updatedAt = new Date().toISOString();
  await writeDb(notes);
  return note;
}

export async function updateNotePinned(
  id: string,
  pinned: boolean,
): Promise<NoteRecord | null> {
  const notes = await readDb();
  const note = notes.find((n) => n.id === id);
  if (!note) return null;
  note.pinned = pinned;
  note.updatedAt = new Date().toISOString();
  await writeDb(notes);
  return note;
}
