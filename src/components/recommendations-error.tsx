import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Glitch } from "@/components/canvasui/Glitch";

// Issue #65: a single broadcast-style glitch burst plays once when the error
// renders, then never recurs. Glitch's timeline fires an initial burst ~0.6s
// after mount and reschedules the next `interval` seconds out; this sentinel
// pushes that reschedule so far into the future the burst is effectively
// one-shot. Named so the intent reads at the call site.
const PLAY_ONCE_INTERVAL = 99999;

export function RecommendationsError({ error }: ErrorComponentProps) {

  console.error("Recommendations route error:", error);

  const isNetworkError = error instanceof Error &&
    (error.message.includes("fetch") || error.message.includes("network"));

  const isServerError = error instanceof Error &&
    error.message.includes("500");

  const isTimeoutError = error instanceof Error &&
    error.message.includes("timeout");

  return (
    <div className="container mx-auto p-4 max-w-4xl mt-8">
      {/*
        Canvas UI Glitch — Issue #65: a broadcast-style tear burst plays once
        when the error renders (single burst, never loops). Per the acceptance
        criteria the effect is over the BACKDROP, not the actionable content:
        the Card (error text + Try Again / Go Back) floats crisp on top, so it
        stays fully legible and clickable at all times; only the decorative
        panel behind it tears.
          - Backdrop: absolute, fills the wrapper, sits BEHIND the card
            (z-0). The Glitch captures and distorts it.
          - Card: relative z-10, in normal flow — fully interactive (its
            buttons live in the DOM subtree, never under the output canvas).
          - prefers-reduced-motion: Glitch zeroes its envelope → clean
            backdrop. No HTML-in-Canvas API: Glitch renders the backdrop in a
            plain div → identical flat card, zero regression.
      */}
      <div className="relative">
        <Glitch
          interval={PLAY_ONCE_INTERVAL}
          duration={0.55}
          intensity={1.1}
          // Overscan the card on all sides so the tear reads past the card
          // edges, not just within them. z-0 keeps it behind the crisp card.
          className="absolute -inset-4 z-0"
        >
          {/* Decorative panel — fills the overscan box. bg-card keeps it
              in-theme; the destructive-tinted border anchors the "error"
              read. aria-hidden: purely decorative, no content to expose. */}
          <div
            aria-hidden="true"
            className="w-full h-full min-h-[440px] bg-card/40 border border-destructive/20 rounded-xl"
          />
        </Glitch>
        <Card className="relative z-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Service Disruption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
              {isNetworkError && "We're having trouble connecting to our recommendation service. Please check your internet connection and try again."}
              {isServerError && "Our recommendation service is currently experiencing issues. We're working on fixing this problem."}
              {isTimeoutError && "The recommendation service is taking longer than expected. Please try again in a moment."}
              {!isNetworkError && !isServerError && !isTimeoutError &&
                "We encountered an unexpected error while generating your recommendations."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => window.location.reload()}
                variant="default"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
              >
                Go Back
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && error instanceof Error && (
              <details className="mt-6 p-4 bg-gray-100 rounded text-sm">
                <summary className="cursor-pointer font-medium">Error details (dev only)</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {error.stack || error.message}
                </pre>
              </details>
            )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}