import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
          </svg>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] font-semibold">
          404
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl mt-2">This note isn’t available</h1>
        <p className="mt-3 text-sm text-[color:var(--color-dim)] leading-relaxed">
          The file with this shared link doesn’t exist, or it has been deleted
          or made private by the owner.
        </p>
        <p className="mt-2 text-[12px] text-[color:var(--color-muted)]">
          If you’re the owner, sign in to see your private notes.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[color:var(--color-accent)] text-white text-sm hover:opacity-90"
          >
            Back to all notes
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-[color:var(--color-line)] text-sm text-[color:var(--color-dim)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-accent)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
