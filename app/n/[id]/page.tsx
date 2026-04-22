import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getNote, readNoteContent } from "@/lib/storage";
import { renderMarkdown } from "@/lib/render";
import { formatBytes, formatRelative, kindLabel } from "@/lib/format";
import { KindIcon } from "@/app/_components/KindIcon";
import { ViewerActions } from "@/app/_components/ViewerActions";
import { HtmlViewer } from "@/app/_components/HtmlViewer";
import { PdfViewer } from "@/app/_components/PdfViewer";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) return { title: "Note not found" };
  return {
    title: `${note.title} · Publish Claude Note`,
    description: `Shared ${kindLabel(note.kind)} note`,
  };
}

export default async function NotePage({ params }: Props) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();

  let renderedHtml: string | null = null;
  if (note.kind === "markdown") {
    const buf = await readNoteContent(note);
    const source = buf.toString("utf8");
    renderedHtml = renderMarkdown(source);
  }

  const rawUrl = `/api/notes/${note.id}/raw`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-dim)] hover:text-[color:var(--color-ink)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            All notes
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <ViewerActions id={note.id} rawUrl={rawUrl} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-start gap-3 mb-6 pb-5 border-b border-[color:var(--color-line)]">
          <KindIcon kind={note.kind} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-accent)] font-semibold">
              {kindLabel(note.kind)}
            </div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl leading-tight mt-1 break-words">
              {note.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[color:var(--color-dim)]">
              <span>{note.originalName}</span>
              <span className="text-[color:var(--color-muted)]">·</span>
              <span>{formatBytes(note.size)}</span>
              <span className="text-[color:var(--color-muted)]">·</span>
              <span>Uploaded {formatRelative(note.createdAt)}</span>
            </div>
          </div>
        </div>

        {note.kind === "markdown" && renderedHtml && (
          <article
            className="prose-note"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}

        {note.kind === "html" && <HtmlViewer rawUrl={rawUrl} title={note.title} />}

        {note.kind === "pdf" && <PdfViewer rawUrl={rawUrl} title={note.title} />}
      </main>
    </div>
  );
}
