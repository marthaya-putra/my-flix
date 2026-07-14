import type { FilmInfo } from "@/lib/types";

// Sentinel streaming protocol (Specs 0004 + 0006). groupStart fires per
// category up front so the client can render skeletons; items interleave as
// TMDB resolves; groupEnd fires exactly once per category on termination
// with a status the client uses to decide between content / error card.
//
// Isolated into its own module so the client can import the type without
// pulling server-only runtime code (ai-sdk, postgres, better-auth) into the
// browser bundle — that was causing `Buffer is not defined`.
export type StreamCategory = "movie" | "tv";
export type StreamStatus =
  | "ok"
  | "generation_failed"
  | "exhausted"
  | "enrichment_empty";

export type StreamStage =
  | "loading_preferences"
  | "finding_titles"
  | "looking_up_posters"
  | "finalizing";

/** Stages that show a label only — no "· found of target" suffix. */
const COUNTLESS_STAGES: ReadonlySet<StreamStage> = new Set([
  "loading_preferences",
]);

export const STAGE_LABELS: Record<StreamStage, string> = {
  loading_preferences: "Loading your preferences",
  finding_titles: "Finding your titles",
  looking_up_posters: "Gathering posters & details",
  finalizing: "Finishing up",
};

/**
 * Friendlier UI copy per stage — communicates *what* is happening. An array
 * per stage so the client can rotate through them while a stage lingers
 * (notably the slow LLM call in `finding_titles`). Stages with a single entry
 * render statically, identical to a plain string.
 */
export const STAGE_MESSAGES: Record<StreamStage, string[]> = {
  loading_preferences: ["Loading your preferences"],
  finding_titles: [
    "Thinking up titles you'll love",
    "Still narrowing things down…",
    "Almost there…",
  ],
  looking_up_posters: ["Sprucing up your recommendations"],
  finalizing: ["Putting on the finishing touches"],
};

/**
 * Copy shown during a deficit-retry round (see CONTEXT.md → Deficit retry
 * loop). Applied globally regardless of stage — a retry is the same process
 * continuing, so one message set covers it. Specializing per-stage later is
 * a matter of turning this into a `Partial<Record<StreamStage, string[]>>`.
 */
export const RETRY_MESSAGES = ["Digging deeper for more titles…"];

/**
 * Pick the message array for a stage, honoring the retry flag. Returns the
 * fallback set when there's no stage yet (before the first progress event).
 */
export function stageMessagesFor(
  stage: StreamStage | undefined,
  retry = false,
): string[] {
  if (retry) return RETRY_MESSAGES;
  if (stage == null) return STAGE_FALLBACK_MESSAGES;
  return STAGE_MESSAGES[stage];
}

/**
 * Copy shown before the first progress event arrives (no stage yet). Module-
 * level so the identity is stable and safe to use as a React effect dep.
 */
export const STAGE_FALLBACK_MESSAGES = ["Finding your next favorites"];

/** Bundled progress for a category stream. */
export interface StreamProgress {
  stage?: StreamStage;
  found?: number;
  target?: number;
}

/**
 * Derive display values from a raw progress triple.
 * Returns `null` before the first progress event (no stage/target/found yet).
 */
export function computeProgress(
  progress: StreamProgress,
): { label: string; found: number; target: number; pct: number } | null {
  const { stage, found, target } = progress;
  if (stage == null) return null;

  // Countless stages (e.g. loading_preferences) have no target — return
  // a label-only result so the client still shows status text.
  if (COUNTLESS_STAGES.has(stage)) {
    return {
      label: STAGE_LABELS[stage],
      found: 0,
      target: 0,
      pct: 0,
    };
  }

  if (target == null || found == null) return null;
  const safeFound = Math.min(found, target);
  const pct = target > 0 ? (safeFound / target) * 100 : 0;
  return {
    label: `${STAGE_LABELS[stage]} · ${safeFound} of ${target}`,
    found: safeFound,
    target,
    pct,
  };
}

export type StreamEvent =
  | { type: "groupStart"; category: StreamCategory; target: number }
  | {
      type: "item";
      rec: {
        title: string;
        category: StreamCategory;
        releasedYear: number;
        reason: string;
        imdbRating: number;
        tmdbData: FilmInfo;
      };
    }
  | {
      type: "groupEnd";
      category: StreamCategory;
      status: StreamStatus;
      error?: string;
    }
  | {
      type: "progress";
      category: StreamCategory;
      stage: StreamStage;
      found: number;
      /** True when emitted from a deficit-retry round (> 1). See CONTEXT.md. */
      retry?: boolean;
    };
