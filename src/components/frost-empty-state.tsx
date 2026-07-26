"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Frost } from "@/components/canvasui/Frost";

// Frost overlay for empty states (issue #67). Mirrors the canvasui.dev
// Frost experience: the message is captured into the canvas and frozen
// over — hover to melt a hole through the ice and read the text, then
// watch it freeze back over.
//
// Mounts <Frost> wrapping the message itself (not a sibling backdrop),
// so the captured content — the empty-state text + icon — is what gets
// frosted, blurred and refracted. Defaults match the canonical demo.
//
// Skips when the user has opted out of effects:
//   - prefers-reduced-motion: reduce → flat empty state (the melt
//     tracker and intro grow-in are motion; Frost itself also zeroes
//     introProgress under reduced motion).
//   - prefers-reduced-transparency: reduce → same flat state (same
//     precedent as the `.glass` solid fallback in app.css).
//
// No HTML-in-Canvas API: Frost renders the message untouched in the DOM
// and draws a frost pane over a transparent backdrop — the empty state
// shows flat with no regression. If WebGL2 is also unavailable,
// createFrost returns null and the React wrapper's `failed` fallback
// renders the message untouched → same flat empty state.
export function FrostEmptyState({ children }: Readonly<{ children: ReactNode }>) {
  // SSR-safe: default to false on server, re-check on client so the
  // effect only mounts when the user has NOT opted out of motion or
  // transparency.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const transparency = window.matchMedia(
      "(prefers-reduced-transparency: reduce)",
    );
    const update = () => setEnabled(!motion.matches && !transparency.matches);
    update();
    motion.addEventListener("change", update);
    transparency.addEventListener("change", update);
    return () => {
      motion.removeEventListener("change", update);
      transparency.removeEventListener("change", update);
    };
  }, []);

  const measureRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setSize({ width: w, height: h });
    };
    measure();
    // Re-measure if the message resizes (responsive reflow) so Frost
    // stays in sync.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  // Effect opted out, or not measured yet: render the plain message.
  // Same content, no regression, no duplicate.
  if (!enabled || size == null) {
    return (
      <div ref={measureRef} style={{ width: "100%" }}>
        {children}
      </div>
    );
  }

  return (
    <Frost style={{ width: size.width, height: size.height }}>
      {children}
    </Frost>
  );
}

export default FrostEmptyState;
