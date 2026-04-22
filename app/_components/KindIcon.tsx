import type { NoteKind } from "@/lib/types";

interface Props {
  kind: NoteKind;
  size?: number;
}

const palette: Record<NoteKind, { bg: string; fg: string; label: string }> = {
  markdown: { bg: "#eef2f9", fg: "#4d6fa3", label: "MD" },
  html: { bg: "#fbeeea", fg: "#b03a2e", label: "HTML" },
  pdf: { bg: "#eef7ef", fg: "#1e6e45", label: "PDF" },
};

export function KindIcon({ kind, size = 34 }: Props) {
  const style = palette[kind];
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-md font-semibold"
      style={{
        width: size,
        height: size,
        background: style.bg,
        color: style.fg,
        fontSize: size <= 24 ? 8 : 10,
        letterSpacing: "0.04em",
      }}
    >
      {style.label}
    </span>
  );
}
