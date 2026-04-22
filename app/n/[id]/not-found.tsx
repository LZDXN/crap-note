import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] font-semibold">
          404
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl mt-2">Note not found</h1>
        <p className="mt-3 text-sm text-[color:var(--color-dim)]">
          This note may have been deleted, or the link is incorrect.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1 mt-6 px-4 py-2 rounded-lg bg-[color:var(--color-accent)] text-white text-sm hover:opacity-90"
        >
          Back to all notes
        </Link>
      </div>
    </div>
  );
}
