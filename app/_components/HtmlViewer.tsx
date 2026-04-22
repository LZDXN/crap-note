"use client";

import { useState } from "react";

interface Props {
  rawUrl: string;
  title: string;
}

// Security note: we deliberately drop `allow-same-origin` from the sandbox.
// Uploaded HTML runs inside a unique (null) origin, so scripts in the note
// cannot read parent DOM, call our credentialed APIs, or reach the admin
// session cookie. The trade-off is we can't read the iframe's scrollHeight
// across origins — so we give the viewer the remaining viewport height and
// let the note scroll inside it.
export function HtmlViewer({ rawUrl, title }: Props) {
  const [loading, setLoading] = useState(true);

  return (
    <div
      className="relative bg-white"
      style={{ height: "calc(100dvh - 52px)" }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--color-bg)]/60 text-[12px] text-[color:var(--color-dim)]">
          Rendering…
        </div>
      )}
      <iframe
        src={rawUrl}
        title={title}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        onLoad={() => setLoading(false)}
        className="w-full h-full block"
        style={{ border: 0 }}
      />
    </div>
  );
}
