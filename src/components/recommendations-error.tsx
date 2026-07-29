import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Glitch } from "@/components/canvasui/Glitch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecommendationsError({ error }: ErrorComponentProps) {
  console.error("Recommendations route error:", error);

  const isNetworkError =
    error instanceof Error &&
    (error.message.includes("fetch") || error.message.includes("network"));

  const isServerError = error instanceof Error && error.message.includes("500");

  const isTimeoutError =
    error instanceof Error && error.message.includes("timeout");

  return (
    <div className="container mx-auto p-4 max-w-4xl mt-8">
      {/*
        Canvas UI Glitch — Issue #65: broadcast-style tear bursts play
        continuously while the error is shown (defaults: a burst every ~3s,
        ~0.4s long). Glitch = breakage is the one surface where aggressive,
        recurring motion fits thematically. Deviates from the issue's "play
        once" wording — deliberately made recurring for dramatic effect.
          - Output canvas is pointer-events:none → the live Card subtree (Try
            Again / Go Back) stays interactive even during each burst.
          - prefers-reduced-motion: Glitch zeroes its envelope → clean card.
          - No HTML-in-Canvas API: Glitch renders children in a plain div →
            identical flat card, zero regression.
      */}
      <GlitchCard>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Service Disruption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {isNetworkError &&
                  "We're having trouble connecting to our recommendation service. Please check your internet connection and try again."}
                {isServerError &&
                  "Our recommendation service is currently experiencing issues. We're working on fixing this problem."}
                {isTimeoutError &&
                  "The recommendation service is taking longer than expected. Please try again in a moment."}
                {!isNetworkError &&
                  !isServerError &&
                  !isTimeoutError &&
                  "We encountered an unexpected error while generating your recommendations."}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                >
                  Try Again
                </Button>
                <Button onClick={() => window.history.back()} variant="outline">
                  Go Back
                </Button>
              </div>

              {process.env.NODE_ENV === "development" &&
                error instanceof Error && (
                  <details className="mt-6 p-4 bg-muted rounded text-sm">
                    <summary className="cursor-pointer font-medium">
                      Error details (dev only)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">
                      {error.stack || error.message}
                    </pre>
                  </details>
                )}
            </div>
          </CardContent>
        </Card>
      </GlitchCard>
    </div>
  );
}

/**
 * Wraps the error card in <Glitch> and feeds it the card's measured height.
 *
 * Why this wrapper exists: the upstream Glitch renders its source/output
 * canvases as `position: absolute; inset: 0` and hosts the children inside
 * the source canvas (also out of flow). With no in-flow content the wrapper
 * collapses to 0px, so the canvases end up 0×0 — capture and render produce
 * nothing and the card vanishes. ParticleScroll (the sister component) avoids
 * this by always being given an explicit height at its call site; the error
 * card's height isn't known ahead of time, so we measure it (one paint) and
 * pass the pixel value to Glitch via `style.height`. Until the measurement
 * lands we render the plain card — same content, no regression, no duplicate.
 */
function GlitchCard({ children }: { children: React.ReactNode }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      if (h && h > 0) setHeight(h);
    };
    measure();
    // Re-measure if the card resizes (e.g. dev-only error-details disclosure,
    // responsive reflow) so Glitch stays in sync.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // No height yet: render the plain card and remember it via measureRef.
  // Once measured, swap to <Glitch> sized to the card.
  if (height == null) {
    return (
      <div ref={measureRef} style={{ width: "100%" }}>
        {children}
      </div>
    );
  }

  return <Glitch style={{ height, width: "100%" }}>{children}</Glitch>;
}
