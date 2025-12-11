import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import type { ErrorComponentProps } from "@tanstack/react-router";

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
      <Card>
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
  );
}