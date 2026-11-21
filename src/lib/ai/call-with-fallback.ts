import type { LanguageModelV2 } from "@ai-sdk/provider";

// A labelled model in the fallback chain. The label flows into logs so the
// chain is self-describing rather than relying on array index.
export type FallbackModel = { label: string; model: LanguageModelV2 };

// Drive the model-fallback chain (google → mistral) under ONE total timeout
// shared across the whole loop (design doc Components §2/§3). `fn` receives
// each model plus the loop's AbortSignal — pass it on as `abortSignal` so a
// slow model cannot overrun the budget. A throw inside `fn` moves to the
// next model; every model failing (or the budget elapsing) resolves null.
// Call sites keep maxRetries: 0 — the chain provides the resilience, not
// the SDK retry loop.
export async function callWithFallback<T>(
  fn: (model: LanguageModelV2, signal: AbortSignal) => Promise<T>,
  models: FallbackModel[],
  { timeoutMs }: { timeoutMs: number },
): Promise<T | null> {
  const signal = AbortSignal.timeout(timeoutMs);

  for (let i = 0; i < models.length; i++) {
    const { label, model } = models[i];
    if (signal.aborted) {
      console.warn(
        `[call-with-fallback] total budget of ${timeoutMs}ms elapsed before model ${i + 1}/${models.length} (${label})`,
      );
      return null;
    }
    console.log(
      `[call-with-fallback] model ${i + 1}/${models.length}: ${label}`,
    );
    try {
      return await fn(model, signal);
    } catch (error) {
      console.warn(`[call-with-fallback] ${label} failed:`, error);
    }
  }
  return null;
}
