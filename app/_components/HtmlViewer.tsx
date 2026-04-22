"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  rawUrl: string;
  title: string;
}

export function HtmlViewer({ rawUrl, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(1200);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    function resize() {
      const el = iframeRef.current;
      if (!el || cancelled) return;
      try {
        const doc = el.contentDocument;
        if (doc) {
          const h = Math.max(
            doc.body?.scrollHeight ?? 0,
            doc.documentElement?.scrollHeight ?? 0,
          );
          if (h > 0) setHeight(h + 24);
        }
      } catch {
        /* cross-origin — keep default */
      }
    }
    const el = iframeRef.current;
    if (!el) return;
    const handler = () => {
      setLoading(false);
      resize();
      // rerun a few times as fonts/images load
      [200, 600, 1500].forEach((t) => setTimeout(resize, t));
    };
    el.addEventListener("load", handler);
    const onWinResize = () => resize();
    window.addEventListener("resize", onWinResize);
    return () => {
      cancelled = true;
      el.removeEventListener("load", handler);
      window.removeEventListener("resize", onWinResize);
    };
  }, [rawUrl]);

  return (
    <div className="relative rounded-lg border border-[color:var(--color-line)] bg-white overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--color-bg)]/60 text-[12px] text-[color:var(--color-dim)]">
          Rendering…
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={rawUrl}
        title={title}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts"
        className="w-full block"
        style={{ height, border: 0 }}
      />
    </div>
  );
}
