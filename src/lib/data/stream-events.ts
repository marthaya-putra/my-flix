import type { FilmInfo } from "@/lib/types";

// Sentinel streaming protocol (Specs 0004 + 0006, extended by the
// title-first design: docs/designs/title-first-recommendations.md).
// groupStart fires per category up front so the client can render
// skeletons; `item` events carry the LLM's own fields (title, year,
// rating, reason) and render cards immediately — no TMDB call sits on
// the critical path. `itemPatch` delivers the background poster lookup
// result per card after all lookups settle; groupEnd fires exactly once
// per category on termination with a status the client uses to decide
// between content / error card.
//
// Isolated into its own module so the client can import the type without
// pulling server-only runtime code (ai-sdk, postgres, better-auth) into the
// browser bundle — that was causing `Buffer is not defined`.
export type StreamCategory = "movie" | "tv";
// With the deficit retry loop deleted, every terminal state is either
// "survivors were emitted" or "the single LLM round produced nothing
// usable" — enrichment_empty and exhausted are unreachable.
export type StreamStatus = "ok" | "generation_failed";

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
  // Covers the patch phase: cards are already rendered; posters and
  // details arrive as itemPatch events while this stage is active.
  looking_up_posters: ["Adding posters & details"],
  finalizing: ["Putting on the finishing touches"],
};

/**
 * Pick the message array for a stage. Returns the fallback set when
 * there's no stage yet (before the first progress event).
 */
export function stageMessagesFor(
  stage: StreamStage | undefined,
): string[] {
  if (stage == null) return STAGE_FALLBACK_MESSAGES;
  return STAGE_MESSAGES[stage];
}

/**
 * Copy shown before the first progress event arrives (no stage yet). Module-
 * level so the identity is stable and safe to use as a React effect dep.
 */
export const STAGE_FALLBACK_MESSAGES = ["Finding your next favorites"];

/** Bundled progress for a category stream. */
export type StreamProgress = {
  stage?: StreamStage;
  found?: number;
  target?: number;
};

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
        /** Absent on LLM-only items — the poster lookup patches it in later. */
        tmdbData?: FilmInfo;
      };
    }
  | {
      /** Background poster-lookup result for one already-rendered card.
        * Keyed by the natural key (category, title, releasedYear); echoes
        * the item's LLM title/year verbatim — never TMDB-corrected values,
        * which would break client addressing. filmInfo is null when the
        * lookup failed or timed out. */
      type: "itemPatch";
      category: StreamCategory;
      title: string;
      releasedYear: number;
      filmInfo: FilmInfo | null;
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
    };
