"use client";

import { useEffect } from "react";

const TRIGGERS = ["wheel", "mousedown", "keydown", "touchstart", "pointerdown"] as const;

export function HashTargetHighlight() {
  useEffect(() => {
    let target: Element | null = null;

    function clear() {
      if (target) {
        target.classList.remove("is-hash-target");
        target = null;
      }
      for (const ev of TRIGGERS) {
        window.removeEventListener(ev, clear);
      }
    }

    function apply() {
      clear();
      const hash = window.location.hash;
      if (!hash || hash === "#") return;
      let id: string;
      try {
        id = decodeURIComponent(hash.slice(1));
      } catch {
        id = hash.slice(1);
      }
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add("is-hash-target");
      target = el;
      // Bring it to the top in case the browser's auto-jump happened before
      // our scroll-margin-top CSS was applied (e.g. cold load with a hash).
      el.scrollIntoView({ block: "start", behavior: "smooth" });
      for (const ev of TRIGGERS) {
        window.addEventListener(ev, clear, { passive: true });
      }
    }

    apply();
    window.addEventListener("hashchange", apply);
    return () => {
      window.removeEventListener("hashchange", apply);
      clear();
    };
  }, []);

  return null;
}
