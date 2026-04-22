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
  /** SHA-256 hex of the stored bytes. Used to reject duplicate uploads. Optional for records written before dedup existed. */
  contentHash?: string;
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

/**
 * Strip control characters, path separators, and leading dots from a user-supplied
 * filename before persisting it. Rejects would-be HTTP-header-splitting payloads
 * (CR/LF) and path traversal attempts at the boundary where data enters the system.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[/\\]/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 200);
  return cleaned || "file";
}

/**
 * Build an RFC 6266 / RFC 5987-compliant Content-Disposition header value.
 * Uses an ASCII fallback plus a UTF-8 `filename*` parameter for non-ASCII names,
 * so non-compliant clients still get a usable filename and compliant ones get the
 * original. Hostile characters (CR/LF/quotes/backslash) are replaced with `_`.
 */
export function contentDispositionHeader(filename: string, download: boolean): string {
  const disposition = download ? "attachment" : "inline";
  const safe = filename.replace(/[\x00-\x1f\x7f"\\]/g, "_");
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
  if (ascii === safe) {
    return `${disposition}; filename="${ascii}"`;
  }
  const encoded = encodeURIComponent(safe);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
