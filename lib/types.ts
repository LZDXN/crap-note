export type NoteKind = "markdown" | "html" | "pdf";

export interface NoteRecord {
  id: string;
  slug: string;
  title: string;
  kind: NoteKind;
  originalName: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  /** Set when the note is stored in Vercel Blob. Undefined for filesystem-backed notes. */
  blobUrl?: string;
  /** Set when the note is stored in Vercel Blob. The pathname within the blob store. */
  blobPathname?: string;
}

export type StorageMode = "filesystem" | "blob";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export function kindFromName(name: string, mimeType?: string): NoteKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".pdf")) return "pdf";
  if (mimeType) {
    if (mimeType === "text/markdown") return "markdown";
    if (mimeType === "text/html") return "html";
    if (mimeType === "application/pdf") return "pdf";
  }
  return null;
}

export function mimeForKind(kind: NoteKind): string {
  switch (kind) {
    case "markdown":
      return "text/markdown; charset=utf-8";
    case "html":
      return "text/html; charset=utf-8";
    case "pdf":
      return "application/pdf";
  }
}
