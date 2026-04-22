"use client";

import { useState } from "react";

interface Props {
  id: string;
  rawUrl: string;
}

export function ViewerActions({ id, rawUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/n/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md border border-[color:var(--color-line)] text-[color:var(--color-dim)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-accent)] transition-colors"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Copied
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            Copy link
          </>
        )}
      </button>
      <a
        href={`${rawUrl}?download=1`}
        className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md border border-[color:var(--color-line)] text-[color:var(--color-dim)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-accent)] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
        <span className="hidden sm:inline">Download</span>
      </a>
    </>
  );
}
