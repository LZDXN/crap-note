"use client";

import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import type { NoteRecord, StorageMode } from "@/lib/types";
import { formatBytes, formatRelative, kindLabel } from "@/lib/format";
import { KindIcon } from "./KindIcon";

interface HomeClientProps {
  initialNotes: NoteRecord[];
  storageMode: StorageMode;
}

type Status =
  | { type: "idle" }
  | { type: "uploading"; name: string }
  | { type: "error"; message: string }
  | { type: "done"; id: string };

export function HomeClient({ initialNotes, storageMode }: HomeClientProps) {
  const [notes, setNotes] = useState<NoteRecord[]>(initialNotes);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "markdown" | "html" | "pdf">("all");
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (filter !== "all" && n.kind !== filter) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.originalName.toLowerCase().includes(q)
      );
    });
  }, [notes, query, filter]);

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    for (const file of list) {
      setStatus({ type: "uploading", name: file.name });
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/notes", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Upload failed.");
        setNotes((prev) => [json.note, ...prev]);
        setStatus({ type: "done", id: json.note.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed.";
        setStatus({ type: "error", message: msg });
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

  const handleCopy = useCallback(async (id: string) => {
    const url = `${window.location.origin}/n/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div className="mx-auto max-w-5xl px-5 py-5 sm:px-8 sm:py-7 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
              Claude Note Garbage Note Box
            </div>
            <h1 className="font-serif text-2xl sm:text-[28px] leading-tight mt-1">
              <em className="text-[color:var(--color-accent)] not-italic">Crap</em> Notes
            </h1>
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
              <div className="mt-4 text-[12px] text-[color:var(--color-dim)]">
                Uploading <span className="font-medium text-[color:var(--color-ink)]">{status.name}</span>…
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

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                placeholder="Search by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/30 focus:border-[color:var(--color-accent)]"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1 text-[12px]">
              {(["all", "markdown", "html", "pdf"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`px-2.5 py-1 rounded-md transition-colors capitalize ${
                    filter === k
                      ? "bg-[color:var(--color-accent)] text-white"
                      : "text-[color:var(--color-dim)] hover:text-[color:var(--color-ink)]"
                  }`}
                >
                  {k === "all" ? "All" : k === "markdown" ? "MD" : k.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {visibleNotes.length === 0 ? (
            <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-6 py-10 text-center text-sm text-[color:var(--color-dim)]">
              {notes.length === 0
                ? "No notes yet. Upload your first file above."
                : "No notes match your filters."}
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleNotes.map((note) => (
                <li
                  key={note.id}
                  className="group relative rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 hover:border-[color:var(--color-accent)] transition-colors"
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
                    <button
                      onClick={() => handleCopy(note.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[color:var(--color-line)] text-[color:var(--color-dim)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-accent)]"
                    >
                      {copiedId === note.id ? (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          Copy link
                        </>
                      )}
                    </button>
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

      <footer className="border-t border-[color:var(--color-line)] mt-12 py-6">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 text-[11px] text-[color:var(--color-muted)] flex flex-wrap items-center justify-between gap-2">
          <span>@LZDXN 2026</span>
        </div>
      </footer>
    </div>
  );
}
