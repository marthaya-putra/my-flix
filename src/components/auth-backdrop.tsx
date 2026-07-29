"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Clouds } from "@/components/canvasui/Clouds";

// Ambient Clouds backdrop behind the auth forms. The canonical Clouds
// effect wraps its children to capture them via HTML-in-Canvas and drift
// fog over the capture — but on auth pages that would render mist *over*
// the inputs, harming legibility. Instead we mount Clouds as a sibling
// backdrop (absolute, behind the form) wrapping an empty surface, so:
//   - the cloud field + cursor wind are visible in the empty space around
//     the card,
//   - the form sits on top in normal flow, fully readable and clickable,
//   - pointer events over the form go to the form, not the wind tracker.
//
// An explicit mist colour is passed because the auto path resolves to
// body's pure-black background (`--background: 0 0% 0%`) and renders
// black clouds on black — invisible. This lifted cool grey stays inside
// the established dark palette (no new theme tokens) while being visible.
//
// prefers-reduced-transparency: reduce skips the effect entirely — same
// precedent as the `.glass` solid fallback in app.css. The Clouds effect
// itself already honours prefers-reduced-motion (freezes drift, only
// re-renders while cursor wind is active).
export function AuthBackdrop({ children }: Readonly<{ children: ReactNode }>) {
  // SSR-safe: default to false on server, re-check on client so the
  // effect only mounts when the user has NOT opted out of transparency.
  const [allowTransparency, setAllowTransparency] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const update = () => setAllowTransparency(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!allowTransparency) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        {children}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <Clouds
        // Clouds hardcodes `position: relative` in its inline style and
        // spreads `...style` after it, so positioning must come through
        // `style` (not className) to actually win. Absolute + inset-0
        // sits the backdrop behind the centered form.
        style={{ position: "absolute", inset: 0 }}
        // Lifted cool grey — visible against the OLED-black background but
        // still ambient. Stays within the dark palette.
        color={[0.16, 0.17, 0.21]}
        opacity={0.45}
        wind={0.7}
        windRadius={400}
        speed={0.5}
      >
        {/* Empty capture surface — gives Clouds a sized content area to
            wrap so the cloud field + wind tracker have dimensions. */}
        <div className="h-full w-full" />
      </Clouds>
      {/* Form on top — z-10 lifts it above the Clouds wrapper's canvases. */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

export default AuthBackdrop;
