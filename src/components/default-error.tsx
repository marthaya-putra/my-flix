import { ErrorComponent, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// Global error fallback. Per-route `errorComponent`s take precedence.
// `error` is `unknown`, not `Error`: matches router-core's ErrorComponentProps
// (widened in newer router-core — thrown values need not be Error instances).
export function DefaultErrorComponent({ error }: { error: unknown }) {
  const router = useRouter();
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <ErrorComponent error={error} />
      <Button variant="outline" onClick={() => router.invalidate()}>
        Retry
      </Button>
    </div>
  );
}
