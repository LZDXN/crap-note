"use client";

interface Props {
  rawUrl: string;
  title: string;
}

export function PdfViewer({ rawUrl, title }: Props) {
  return (
    <div className="rounded-lg border border-[color:var(--color-line)] bg-white overflow-hidden">
      <object
        data={`${rawUrl}#view=FitH`}
        type="application/pdf"
        className="w-full h-[85vh] min-h-[500px] block"
      >
        <div className="p-6 text-center text-sm text-[color:var(--color-dim)]">
          <p>Your browser cannot display this PDF inline.</p>
          <a
            href={rawUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 px-4 py-2 rounded-md bg-[color:var(--color-accent)] text-white text-[13px] hover:opacity-90"
          >
            Open {title} in a new tab
          </a>
        </div>
      </object>
    </div>
  );
}
