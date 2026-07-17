import { ErrorComponent } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// Global error fallback. Per-route `errorComponent`s take precedence.
export function DefaultErrorComponent({
  error,
}: {
  error: Error;
}) {
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
