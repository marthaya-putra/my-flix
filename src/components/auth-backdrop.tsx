"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clouds } from "@/components/canvasui/Clouds";

// Ambient mist behind the auth forms. The Clouds layer is absolutely
// positioned with pointer-events:none, so it never intercepts clicks on
// the form card and never overlaps actionable content.
//
// Respect prefers-reduced-transparency: reduce by skipping the effect
// entirely — same precedent as the `.glass` solid fallback in app.css.
// The Clouds effect itself already respects prefers-reduced-motion
// (renders one static frame, stops the loop).
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

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {allowTransparency ? (
        <Clouds className="absolute inset-0 h-full w-full pointer-events-none" />
      ) : null}
      {children}
    </div>
  );
}

export default AuthBackdrop;
