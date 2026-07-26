"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Frost } from "@/components/canvasui/Frost";

// Frost overlay for empty states (issue #67). Mirrors the canvasui.dev
// Frost experience: the message is captured into the canvas and frozen
// over — hover to melt a hole through the ice and read the text, then
// watch it freeze back over.
//
// The frost pane fills the whole empty-state box (w-full h-full, with a
// min-h floor for containers that have no definite height), and the
// message is centred inside it — so the ice covers the full empty
// region, not just a tight box around the text.
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

  // Shared layout for both paths: fill the empty box, centre the message.
  // h-full fills containers with a definite height (e.g. the search
  // modal's scroll area); min-h is the floor when the container has none.
  const box = "flex w-full h-full min-h-[240px] flex-col items-center justify-center text-center";

  if (!enabled) {
    return <div className={box}>{children}</div>;
  }

  return (
    <Frost className={box}>
      {children}
    </Frost>
  );
}

export default FrostEmptyState;
