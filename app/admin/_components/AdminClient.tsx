"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { NoteRecord } from "@/lib/types";
import { formatBytes, formatRelative, kindLabel } from "@/lib/format";
import { KindIcon } from "@/app/_components/KindIcon";

type Status =
  | { type: "idle" }
  | { type: "uploading"; name: string; progress: number }
  | { type: "error"; message: string }
  | { type: "done"; id: string };

function uploadViaXhr(
  file: File,
  onProgress: (fraction: number) => void,
  registerXhr: (xhr: XMLHttpRequest | null) => void,
): Promise<{ ok: true; note: NoteRecord } | { ok: false; status: number; message: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    registerXhr(xhr);
    xhr.open("POST", "/api/notes");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      registerXhr(null);
      let body: { note?: NoteRecord; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.note) {
        resolve({ ok: true, note: body.note });
      } else {
        resolve({
          ok: false,
          status: xhr.status,
          message: body.error || `Upload failed (${xhr.status}).`,
        });
      }
    };
    xhr.onerror = () => {
      registerXhr(null);
      resolve({ ok: false, status: 0, message: "Network error during upload." });
    };
    xhr.onabort = () => {
      registerXhr(null);
      resolve({ ok: false, status: 0, message: "Upload cancelled." });
    };
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

interface AdminClientProps {
  initialNotes: NoteRecord[];
  username: string;
}

export function AdminClient({ initialNotes, username }: AdminClientProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteRecord[]>(initialNotes);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    const onUnload = () => {
      activeXhrRef.current?.abort();
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      if (res.ok) {
        const { notes: fresh } = (await res.json()) as { notes: NoteRecord[] };
        setNotes(fresh);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    for (const file of list) {
      setStatus({ type: "uploading", name: file.name, progress: 0 });
      const result = await uploadViaXhr(
        file,
        (fraction) =>
          setStatus({ type: "uploading", name: file.name, progress: fraction }),
        (xhr) => {
          activeXhrRef.current = xhr;
        },
      );
      if (result.ok) {
        setNotes((prev) => [result.note, ...prev]);
        setStatus({ type: "done", id: result.note.id });
      } else {
        setStatus({ type: "error", message: result.message });
        return;
      }
    }
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer?.files?.length) void upload(e.dataTransfer.files);
    },
    [upload],
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this note? The shareable link will stop working.")) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-5xl px-5 py-5 sm:px-8 sm:py-7 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
              Admin
            </div>
            <h1 className="font-serif text-2xl sm:text-[28px] leading-tight mt-1">
              Upload & manage
            </h1>
            {username && (
              <div className="mt-1 text-[11px] text-[color:var(--color-muted)]">
                Signed in as <span className="font-medium">{username}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh notes"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] border border-[color:var(--color-line)] rounded-lg px-3 py-1.5 disabled:opacity-50 transition-colors"
            >
              <svg
                className={refreshing ? "animate-spin" : ""}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 1-9 9c-4.97 0-9-4.03-9-9s4.03-9 9-9c2.39 0 4.68.94 6.36 2.64L21 8" />
                <polyline points="21 3 21 8 16 8" />
              </svg>
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] border border-[color:var(--color-line)] rounded-lg px-3 py-1.5"
            >
              View site
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] border border-[color:var(--color-line)] rounded-lg px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 sm:px-8 py-6 sm:py-10 space-y-8">
        <section>
          <label
            htmlFor="file-input"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative block rounded-xl border-2 border-dashed px-5 py-10 sm:py-14 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]"
                : "border-[color:var(--color-line)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-accent)]"
            }`}
          >
            <input
              ref={inputRef}
              id="file-input"
              type="file"
              accept=".md,.markdown,.html,.htm,.pdf,text/markdown,text/html,application/pdf"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) void upload(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m5 12 7-7 7 7" /></svg>
            </div>
            <div className="mt-3 text-sm font-medium">
              Drop files here, or <span className="text-[color:var(--color-accent)] underline">browse</span>
            </div>
            <div className="mt-1 text-[12px] text-[color:var(--color-dim)]">
              .md · .markdown · .html · .htm · .pdf — up to 50 MB each
            </div>

            {status.type === "uploading" && (
              <div className="mt-5 mx-auto max-w-sm space-y-2">
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <div className="truncate text-[color:var(--color-dim)]">
                    Uploading{" "}
                    <span className="font-medium text-[color:var(--color-ink)]">
                      {status.name}
                    </span>
                    …
                  </div>
                  <div className="text-[color:var(--color-dim)] tabular-nums">
                    {Math.round(status.progress * 100)}%
                  </div>
                </div>
                <div className="relative h-1.5 rounded-full bg-[color:var(--color-line)] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[color:var(--color-accent)] transition-[width] duration-200 ease-out"
                    style={{ width: `${Math.max(4, status.progress * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {status.type === "done" && (
              <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Uploaded
              </div>
            )}
            {status.type === "error" && (
              <div className="mt-4 inline-block text-[12px] px-3 py-1.5 rounded bg-red-50 text-red-700 border border-red-200">
                {status.message}
              </div>
            )}
          </label>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-lg sm:text-xl">Your notes</h2>
            <span className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-muted)]">
              {notes.length} {notes.length === 1 ? "file" : "files"}
            </span>
          </div>

          {notes.length === 0 ? (
            <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-6 py-10 text-center text-sm text-[color:var(--color-dim)]">
              No notes yet. Upload your first file above.
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="group relative rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4"
                >
                  <Link href={`/n/${note.id}`} className="block">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <KindIcon kind={note.kind} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[15px] leading-snug break-words">
                          {note.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[color:var(--color-dim)]">
                          <span className="uppercase tracking-wider font-medium">
                            {kindLabel(note.kind)}
                          </span>
                          <span className="text-[color:var(--color-muted)]">·</span>
                          <span>{formatBytes(note.size)}</span>
                          <span className="text-[color:var(--color-muted)]">·</span>
                          <span>{formatRelative(note.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="mt-3 flex items-center gap-1 text-[11px]">
                    <a
                      href={`/api/notes/${note.id}/raw?download=1`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[color:var(--color-line)] text-[color:var(--color-dim)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-accent)]"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded border border-transparent text-[color:var(--color-muted)] hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
