"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const SHOW_THRESHOLD_PX = 600;
const STORAGE_KEY = "btt-corner";
const EDGE_PX = 20;
const TOP_EDGE_PX = 72;
const DRAG_THRESHOLD_PX = 5;
const SUPPRESS_CLICK_MS = 350;

type Corner = "bl" | "tl" | "br" | "tr";

function isCorner(v: unknown): v is Corner {
  return v === "bl" || v === "tl" || v === "br" || v === "tr";
}

function cornerStyle(corner: Corner): CSSProperties {
  return {
    top: corner[0] === "t" ? TOP_EDGE_PX : "auto",
    bottom: corner[0] === "b" ? EDGE_PX : "auto",
    left: corner[1] === "l" ? EDGE_PX : "auto",
    right: corner[1] === "r" ? EDGE_PX : "auto",
  };
}

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [corner, setCorner] = useState<Corner>("bl");
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    dragged: boolean;
  } | null>(null);
  const justDraggedRef = useRef(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (isCorner(v)) setCorner(v);
    } catch {}
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_THRESHOLD_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function backToTop() {
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isMobile) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      dragged: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const s = dragStateRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    s.dragged = true;
    setDrag({ x: e.clientX - s.offsetX, y: e.clientY - s.offsetY });
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const s = dragStateRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    dragStateRef.current = null;
    if (!s.dragged) {
      setDrag(null);
      return;
    }
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, SUPPRESS_CLICK_MS);
    if (drag) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = drag.x + rect.width / 2;
      const cy = drag.y + rect.height / 2;
      const h = cx < window.innerWidth / 2 ? "l" : "r";
      const v = cy < window.innerHeight / 2 ? "t" : "b";
      const next = (v + h) as Corner;
      setCorner(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
    }
    setDrag(null);
  }

  function onClick() {
    if (justDraggedRef.current) return;
    backToTop();
  }

  const positionStyle: CSSProperties = !isMobile
    ? {}
    : drag
      ? { top: drag.y, left: drag.x, bottom: "auto", right: "auto", transition: "none" }
      : cornerStyle(corner);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label="Back to top"
      style={{ touchAction: "none", ...positionStyle }}
      className={`fixed bottom-5 left-5 sm:bottom-6 sm:left-6 z-30 inline-flex items-center justify-center gap-1.5 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/95 h-10 w-10 sm:h-auto sm:w-auto sm:px-3.5 sm:py-2 text-[12px] text-[color:var(--color-dim)] shadow-md backdrop-blur transition-[opacity,transform] duration-200 hover:text-[color:var(--color-ink)] ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="sm:h-3.5 sm:w-3.5"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
      <span className="sr-only sm:not-sr-only">Back to top</span>
    </button>
  );
}
