"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { NoteRecord, StorageMode } from "@/lib/types";
import { formatBytes, formatRelative, kindLabel } from "@/lib/format";
import { KindIcon } from "./KindIcon";

interface AuthState {
  authenticated: boolean;
  configured: boolean;
}

interface HomeClientProps {
  initialNotes: NoteRecord[];
  storageMode: StorageMode;
  initialAuth: AuthState;
}

export function HomeClient({ initialNotes, storageMode, initialAuth }: HomeClientProps) {
  const [notes, setNotes] = useState<NoteRecord[]>(initialNotes);
  const [auth, setAuth] = useState<AuthState>(initialAuth);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "markdown" | "html" | "pdf">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [notesRes, sessionRes] = await Promise.all([
        fetch("/api/notes", { cache: "no-store" }),
        fetch("/api/auth/session", { cache: "no-store" }),
      ]);
      if (notesRes.ok) {
        const { notes: fresh } = (await notesRes.json()) as { notes: NoteRecord[] };
        setNotes(fresh);
      }
      if (sessionRes.ok) {
        const s = (await sessionRes.json()) as AuthState;
        setAuth(s);
      }
    } finally {
      setRefreshing(false);
    }
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
          <div className="flex items-center gap-2">
            {auth.configured && (
              <Link
                href={auth.authenticated ? "/admin" : "/admin/login"}
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] border border-[color:var(--color-line)] rounded-lg px-3 py-1.5 transition-colors"
              >
                {auth.authenticated ? "Admin" : "Sign in"}
              </Link>
            )}
            <button
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh notes"
              title={`Storage: ${storageMode === "blob" ? "Vercel Blob" : "Local FS"}`}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] border border-[color:var(--color-line)] rounded-lg px-3 py-1.5 disabled:opacity-50 transition-colors"
            >
              <svg
                className={refreshing ? "animate-spin" : ""}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 1-9 9c-4.97 0-9-4.03-9-9s4.03-9 9-9c2.39 0 4.68.94 6.36 2.64L21 8" />
                <polyline points="21 3 21 8 16 8" />
              </svg>
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 sm:px-8 py-6 sm:py-10 space-y-8">
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-lg sm:text-xl">Craps</h2>
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
                ? "No notes yet."
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
