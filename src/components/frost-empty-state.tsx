"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Frost } from "@/components/canvasui/Frost";

// Ambient Frost overlay for empty states (issue #67). The Frost effect
// captures its children into the canvas and frosts them — that would
// frost the empty-state text itself, harming legibility. So, mirroring
// auth-backdrop.tsx's Clouds pattern, we mount Frost as a sibling
// backdrop *behind* the message wrapping an empty capture surface:
//   - the frost pane + refraction are visible in the space around / behind
//     the text,
//   - the message sits on top in normal flow, fully readable and clickable,
//   - pointer events over the message go to the message, not the frost.
//
// Static instance (staticMode) — no cursor melt, no intro grow-in, no
// shimmer — because these are passive moments where interaction-driven
// motion would be noisy (issue constraint). The frost settles on its
// first frame and the render loop stops, so it costs nothing when idle.
//
// Skips when the user has opted out of effects:
//   - prefers-reduced-motion: reduce → flat empty state shows (issue
//     acceptance criterion; static mode would otherwise still render the
//     pane since introDuration is already 0).
//   - prefers-reduced-transparency: reduce → same flat state (same
//     precedent as the `.glass` solid fallback in app.css).
//
// No HTML-in-Canvas API: Frost still renders a frost pane over a
// transparent backdrop (no DOM capture), so the empty state gains an icy
// texture behind the text with zero content regression. If WebGL2 is also
// unavailable, createFrost returns null and the React wrapper's `failed`
// state falls back to rendering the children (empty surface) untouched —
// the empty state shows flat, exactly as today.
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

  if (!enabled) {
    return <div className="relative">{children}</div>;
  }

  return (
    <div className="relative">
      {/* Frost backdrop — absolute, behind the message. */}
      <Frost
        // Frost hardcodes `position: relative` in its inline style and
        // spreads `...style` after it, so positioning must come through
        // `style` (not className) to win. Absolute + inset-0 sits the
        // pane behind the centered message.
        style={{ position: "absolute", inset: 0 }}
        // Cool blue-white ice tints — the canonical Frost defaults. Kept
        // (not recoloured) because they read as "frost" against the dark
        // empty-state backgrounds of both surfaces. No new theme tokens.
        tintThin={[0.82, 0.86, 1.05]}
        tintThick={[0.92, 0.96, 1.1]}
        // Quiet coverage: lower strength + opacity than the cursor-melt
        // default so the texture stays ambient behind the text rather
        // than frosting it opaque.
        strength={0.5}
        opacity={0.45}
        haze={0.35}
        highlight={0.25}
        // Static ambient instance — the core constraint of issue #67.
        staticMode
        introDuration={0}
        shimmer={0}
      >
        {/* Empty capture surface — gives Frost a sized content area to
            wrap so the frost pane has dimensions. */}
        <div className="h-full w-full" />
      </Frost>
      {/* Message on top — z-10 lifts it above the Frost wrapper's
          canvases. */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default FrostEmptyState;
