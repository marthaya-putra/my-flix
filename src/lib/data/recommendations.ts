import { z } from "zod";
import { getAIRecommendations } from "../ai/recommendations";
import { FilmInfo } from "../types";
import type { UserContent } from "./preferences";
import {
  exclusionHitFor,
  type ExclusionPools,
  type TitleRef,
} from "../utils/title-matcher";
import { searchMoviesAPI, searchTVsAPI } from "./search";

// Re-export the wire types from the isolated module so server callers have
// one import path. The client imports directly from ./stream-events to
// avoid pulling server runtime code into the browser bundle.
export type {
  StreamCategory,
  StreamEvent,
  StreamStage,
  StreamStatus,
} from "./stream-events";

import type {
  StreamCategory,
  StreamEvent,
  StreamStage,
  StreamStatus,
} from "./stream-events";

// ---- Title-first tuning constants (docs/designs/title-first-recommendations.md) ----
// One LLM round per category, overask = 2 × target. Surplus candidates
// absorb matcher exclusions and lookup misses; there are NO deficit retry
// rounds (MAX_ROUNDS / STRICT_RATING_ROUNDS / retry events deleted).
const TARGET_PER_CATEGORY = 3;
const OVERASK_MULTIPLIER = 2;

// IMDB quality bar (prompt-only, applied in the single round).
const MIN_IMDB_RATING = 7.5;

// Per-lookup poster timeout (CUJ 1: the wait is bounded per lookup).
const POSTER_LOOKUP_TIMEOUT_MS = 10_000;

// Baseline (recorded before this rework, per the design's verification
// plan): the old blocking-enrichment pipeline logged one line per round —
// `round N reject breakdown: excluded=X enrichFail=Y capped=Z survivors=…`
// (old recommendations.ts:347-349) — and enrichFail (TMDB search miss or
// throw) was the author-observed largest reject cause. That enrichFail
// rate is the comparator for the fake-title rate that
// scripts/verify-titles.mjs reports from RECO_DEBUG_LOG patch misses.

type Category = StreamCategory;

// The LLM's raw recommendation — the full card payload minus the poster.
type RawRec = {
  title: string;
  category: Category;
  releasedYear: number;
  reason: string;
  imdbRating: number;
};

// Per-category TMDB search adapter. Replaces the repeated
// `category === "movie" ? searchMoviesAPI : searchTVsAPI` ternary; adds
// the optional AbortSignal threading (design doc item 11).
const categorySearch: Record<
  Category,
  (query: string, year: number | undefined, signal?: AbortSignal) => Promise<{
    results: FilmInfo[];
  }>
> = {
  movie: (query, year, signal) =>
    searchMoviesAPI({ query, primaryReleaseYear: year, page: 1 }, signal),
  tv: (query, year, signal) =>
    searchTVsAPI({ query, firstAirDateYear: year, page: 1 }, signal),
};

// Year-extract helper (handles both movie release_date and tv first_air_date).
function releaseYear(releaseDate: string): number | null {
  if (!releaseDate) return null;
  const y = parseInt(releaseDate.slice(0, 4), 10);
  return Number.isNaN(y) ? null : y;
}

// Combine an outer (route/disconnect) signal with a per-lookup timeout.
// AbortSignal.any is unavailable in some runtimes (jsdom), so wire it by
// hand: whichever source fires first aborts the controller.
function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const controller = new AbortController();
  const forward = (source: AbortSignal) => () => {
    if (!controller.signal.aborted) controller.abort(source.reason);
  };
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", forward(signal), { once: true });
  }
  const timeout = AbortSignal.timeout(timeoutMs);
  if (timeout.aborted) controller.abort(timeout.reason);
  else timeout.addEventListener("abort", forward(timeout), { once: true });
  return controller.signal;
}

// Search TMDB for a title+year. The LLM's year is often off-by-one
// (festival vs wide release) or otherwise slightly wrong, so an exact
// year match returns nothing. Strategy: try the exact year first; if that
// yields nothing, re-search without the year and pick the result whose
// year is closest to the requested one. Forwards the given signal to the
// search calls; applies the 10s poster-lookup timeout when none is given.
async function searchTitleWithYearFallback(
  title: string,
  category: Category,
  requestedYear: number,
  signal?: AbortSignal,
): Promise<FilmInfo | null> {
  const effective = signal ?? AbortSignal.timeout(POSTER_LOOKUP_TIMEOUT_MS);
  const exact = await categorySearch[category](title, requestedYear, effective);
  if (exact.results.length > 0) return exact.results[0];

  // Year-filtered search returned nothing — retry without the year and
  // pick the closest match by release year to avoid grabbing a wrong title.
  const loose = await categorySearch[category](title, undefined, effective);
  if (loose.results.length === 0) return null;

  const scored = loose.results
    .map((r) => {
      const y = releaseYear(r.releaseDate);
      return { r, dist: y === null ? Infinity : Math.abs(y - requestedYear) };
    })
    .sort((a, b) => a.dist - b.dist);

  return scored[0].r;
}

// Single LLM round through the Mastra agent edge. Model routing
// (gemini-3.8-flash → mistral, advancing on any step failure) is internal
// to the agent (#131/#135); getAIRecommendations never throws — it maps a
// total chain failure to { success: false }. Returns this category's raw
// recs — possibly fewer than asked, possibly empty — or null when the
// chain failed (→ generation_failed).
async function fetchRawOnce(
  args: Parameters<typeof getAIRecommendations>[0],
  category: Category,
): Promise<RawRec[] | null> {
  const res = await getAIRecommendations(args);
  if (!res.success || !res.data) {
    console.warn(`[recommendations:${category}] reco agent call failed`);
    return null;
  }
  // LLM may still emit the other category despite the prompt —
  // filter to this side only.
  const raw = res.data.recommendations.filter(
    (r): r is RawRec => r.category === category,
  );
  console.log(`[recommendations:${category}] model ok, raw=${raw.length}`);
  return raw;
}

// Terminal status classification: survivors were emitted → ok; anything
// else (all models failed, or the round produced nothing usable) →
// generation_failed. enrichment_empty/exhausted died with the retry loop.
function classifyStatus(survivors: number): StreamStatus {
  return survivors > 0 ? "ok" : "generation_failed";
}

// Shared base args passed into getAIRecommendations for each category.
type CategoryArgs = {
  previouslyLikedMovies: Array<{ id?: number; title: string; year: number }>;
  previouslyLikedTvs: Array<{ id?: number; title: string; year: number }>;
  dislikedMovies: Array<{ id?: number; title: string; year: number }>;
  dislikedTvs: Array<{ id?: number; title: string; year: number }>;
  favoriteActors: string[];
  favoriteDirectors: string[];
  genres: string[];
  excludeAdult: boolean;
  previousRecommendations: Array<{
    id?: number;
    title: string;
    year: number;
    category: Category;
  }>;
};

// Everything one category generator needs, built once per run.
type CategoryRun = {
  category: Category;
  loadPrefs: () => Promise<UserContent>;
  // Memoized profile thunk — resolves null when absent/failed (fail-open).
  profileFor: (content: UserContent) => Promise<string | null>;
  previousRecommendations: CategoryArgs["previousRecommendations"];
  /** Route request signal — client disconnect cancels in-flight lookups. */
  signal?: AbortSignal;
  runId: string;
};

// Exclusion pools for the matcher: liked ∪ disliked ∪ prevRecs ∪ earlier
// survivors this round ("round" grows as survivors are accepted, so
// within-round duplicates are filtered too).
function buildPools(
  userPrefs: UserContent,
  previousRecommendations: CategoryArgs["previousRecommendations"],
): ExclusionPools {
  const asMovie = (t: { title: string; year: number }): TitleRef => ({
    category: "movie",
    title: t.title,
    year: t.year,
  });
  const asTv = (t: { title: string; year: number }): TitleRef => ({
    category: "tv",
    title: t.title,
    year: t.year,
  });
  return {
    liked: [
      ...userPrefs.movies.map(asMovie),
      ...userPrefs.tvs.map(asTv),
    ],
    disliked: [
      ...userPrefs.dislikedMovies.map(asMovie),
      ...userPrefs.dislikedTvs.map(asTv),
    ],
    prevRecs: previousRecommendations.map((r) => ({
      category: r.category,
      title: r.title,
      year: r.year,
    })),
    round: [],
  };
}

// Per-category pipeline (title-first). Yields StreamEvents in order:
// loading_preferences → finding_titles → item per survivor (LLM fields,
// no tmdbData) → looking_up_posters → itemPatch per item in item order →
// finalizing → exactly one groupEnd. Poster lookups run concurrently off
// the critical path, each bounded by POSTER_LOOKUP_TIMEOUT_MS.
async function* backfillCategory(run: CategoryRun): AsyncGenerator<StreamEvent> {
  const { category } = run;

  const progress = (stage: StreamStage, found = 0): StreamEvent => ({
    type: "progress",
    category,
    stage,
    found,
  });

  try {
    // Spec 0011: yield loading_preferences first, before any await,
    // so the client shows status during the DB fetch. The taste-profile
    // step (when supplied) also runs under this stage.
    yield progress("loading_preferences");

    const userPrefs = await run.loadPrefs();
    const tasteProfile = await run.profileFor(userPrefs);

    const baseArgs: CategoryArgs = {
      previouslyLikedMovies: userPrefs.movies,
      previouslyLikedTvs: userPrefs.tvs,
      dislikedMovies: userPrefs.dislikedMovies,
      dislikedTvs: userPrefs.dislikedTvs,
      favoriteActors: userPrefs.actors,
      favoriteDirectors: userPrefs.directors,
      genres: userPrefs.genres,
      excludeAdult: true,
      previousRecommendations: run.previousRecommendations,
    };

    const pools = buildPools(userPrefs, run.previousRecommendations);

    // Single round with overask: ask 2 × target so matcher exclusions and
    // lookup misses are absorbed by surplus candidates (design §5).
    const ask = TARGET_PER_CATEGORY * OVERASK_MULTIPLIER;
    console.log(
      `[recommendations:${category}] single round ask=${ask} ratingBar=strict(>${MIN_IMDB_RATING}) telling LLM to avoid ${run.previousRecommendations.length} titles: [${run.previousRecommendations.map((r) => r.title).join(", ")}]`,
    );

    yield progress("finding_titles");

    const raw =
      (await fetchRawOnce(
        {
          ...baseArgs,
          requestedMovies: category === "movie" ? ask : 0,
          requestedTvs: category === "tv" ? ask : 0,
          onlyCategory: category,
          minImdbRating: MIN_IMDB_RATING,
          ...(tasteProfile ? { tasteProfile } : {}),
        },
        category,
      )) ?? [];

    // Matcher filter — the only reject step. Survivors cap at the target
    // (existing cap logic); every exclusion is counted per source.
    const survivors: RawRec[] = [];
    const excluded = { liked: 0, disliked: 0, prevRecs: 0, round: 0 };
    let capped = 0;
    for (const rec of raw) {
      if (survivors.length >= TARGET_PER_CATEGORY) {
        capped++;
        continue;
      }
      const hit = exclusionHitFor(
        { category: rec.category, title: rec.title, year: rec.releasedYear },
        pools,
      );
      if (hit) {
        excluded[hit]++;
        continue;
      }
      survivors.push(rec);
      pools.round.push({
        category: rec.category,
        title: rec.title,
        year: rec.releasedYear,
      });
    }
    console.log(
      `[recommendations:${category}] matcher filter: raw=${raw.length} survivors=${survivors.length} excluded(liked=${excluded.liked} disliked=${excluded.disliked} prevRecs=${excluded.prevRecs} round=${excluded.round}) capped=${capped}`,
    );

    // One outcome per survivor, in item order — filled after the lookups
    // settle; also read by the env-gated debug line below.
    const patchOutcomes: Array<{
      title: string;
      year: number;
      found: boolean;
    }> = [];

    if (survivors.length > 0) {
      // Kick the poster lookups off before yielding items so the network
      // work overlaps event serialization. A lookup failure resolves
      // filmInfo: null — never removes or delays the card.
      const patchPromises = survivors.map((rec) =>
        searchTitleWithYearFallback(
          rec.title,
          rec.category,
          rec.releasedYear,
          withTimeout(run.signal, POSTER_LOOKUP_TIMEOUT_MS),
        ).catch((error) => {
          console.error(
            `[recommendations:${category}] poster lookup failed for "${rec.title}":`,
            error,
          );
          return null;
        }),
      );

      // Items render immediately from LLM fields — no tmdbData.
      for (const rec of survivors) {
        yield { type: "item", rec: { ...rec } };
      }
      yield progress("looking_up_posters", survivors.length);

      // One patch per item, in item order, after every lookup settles.
      const settled = await Promise.allSettled(patchPromises);
      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        const filmInfo =
          result.status === "fulfilled" ? result.value : null;
        patchOutcomes.push({
          title: survivors[i].title,
          year: survivors[i].releasedYear,
          found: filmInfo !== null,
        });
        yield {
          type: "itemPatch",
          category,
          title: survivors[i].title,
          releasedYear: survivors[i].releasedYear,
          filmInfo,
        };
      }
    }

    yield progress("finalizing", survivors.length);

    const status = classifyStatus(survivors.length);
    console.log(
      `[recommendations:${category}] groupEnd status=${status} survivors=${survivors.length} raw=${raw.length}`,
    );

    // Structured per-run debug line (env-gated). scripts/verify-titles.mjs
    // parses these to report per-title hit/miss and the fake-title rate —
    // its oracle is exactly the pipeline's own lookup (no TMDB re-query).
    if (process.env.RECO_DEBUG_LOG) {
      console.log(
        `RECO_DEBUG_LOG ${JSON.stringify({
          runId: run.runId,
          category,
          titles: survivors.map((r) => ({
            title: r.title,
            year: r.releasedYear,
          })),
          patchOutcomes,
          matcherExcluded: excluded,
        })}`,
      );
    }

    yield { type: "groupEnd", category, status };
  } catch (error: any) {
    console.error(`[recommendations:${category}] pipeline threw:`, error);
    yield {
      type: "groupEnd",
      category,
      status: "generation_failed",
      error:
        typeof error === "string"
          ? error
          : error?.message || "Recommendation pipeline failed",
    };
  }
}

// Race-merge N category generators into one interleaved stream.
// Emits groupStart for each category up front (so the client renders
// skeletons immediately), then forwards events from whichever generator
// resolves next. Each generator's groupEnd is emitted exactly once (the
// generator guarantees it, even on throw). The try/finally forwards
// return() to the child generators — when the route stops draining the
// stream (client disconnect), children terminate and their in-flight
// lookups observe the route signal.
async function* raceMerge(
  generators: { category: Category; gen: AsyncGenerator<StreamEvent> }[],
  target: number,
): AsyncGenerator<StreamEvent> {
  if (generators.length === 0) return;

  try {
    // Emit groupStart for every requested category up front.
    for (const { category } of generators) {
      yield { type: "groupStart", category, target };
    }

    type Tagged = { cat: Category; result: IteratorResult<StreamEvent> };
    const nextTagged = (
      cat: Category,
      gen: AsyncGenerator<StreamEvent>,
    ): Promise<Tagged> => gen.next().then((result) => ({ cat, result }));

    // Track in-flight promises. Nulling a promise and decrementing remaining
    // happen together, so #non-null-promises === remaining at all times — the
    // loop never races an empty pending list and never hangs.
    const promises = new Map<Category, Promise<Tagged> | null>();
    for (const { category, gen } of generators) {
      promises.set(category, nextTagged(category, gen));
    }

    let remaining = generators.length;

    while (remaining > 0) {
      const pending = [...promises.entries()]
        .filter(([, p]) => p !== null)
        .map(([, p]) => p!);

      const { cat, result } = await Promise.race(pending);

      if (result.done) {
        promises.set(cat, null);
        remaining--;
      } else {
        yield result.value;
        const gen = generators.find((g) => g.category === cat)!;
        promises.set(cat, nextTagged(cat, gen.gen));
      }
    }
  } finally {
    for (const { gen } of generators) {
      await gen.return(undefined as unknown as void);
    }
  }
}

// Input the NDJSON route accepts over the wire. The client sends ONLY
// previousRecommendations (transient shown-not-yet-liked state the server
// can't derive). userPrefs is loaded server-side from the DB via
// loadUserContent(userId) — never trusted from the client.
export const streamRequestSchema = z.object({
  categories: z.array(z.enum(["movie", "tv"])).optional(),
  previousRecommendations: z.array(
    z.object({
      id: z.number().optional(),
      title: z.string(),
      year: z.number(),
      category: z.enum(["movie", "tv"]),
    }),
  ),
});
export type StreamRequest = z.infer<typeof streamRequestSchema>;

// Resolve the category list from an optional raw array. Undefined or empty
// = both categories (backward compatible). Dedupes to avoid running the same
// pipeline twice. Exported so the route error handler can reuse the same
// resolution without re-deriving it.
const ALL_CATEGORIES: Category[] = ["movie", "tv"];
export function resolveCategories(raw?: Category[]): Category[] {
  return !raw || raw.length === 0 ? ALL_CATEGORIES : [...new Set(raw)];
}

// Pipeline entry point (Spec 0006 + 0011, title-first design §3). Takes a
// lazy loadPrefs thunk + previousRecommendations and drives raceMerge over
// the requested category generators. loadPrefs is memoized (one DB
// round-trip per run) and so is deriveProfile (one profile call per run,
// shared by both categories). Optional `signal` is the route's
// request.signal — disconnect cancels in-flight poster lookups.
export async function* runPipelines(input: {
  loadPrefs: () => Promise<UserContent>;
  previousRecommendations: StreamRequest["previousRecommendations"];
  categories?: Category[];
  deriveProfile?: (content: UserContent) => Promise<string | null>;
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const {
    loadPrefs,
    previousRecommendations,
    categories: rawCategories,
    deriveProfile,
    signal,
  } = input;

  const requested = resolveCategories(rawCategories);

  // Memoize loadPrefs: first caller triggers the single DB round-trip;
  // subsequent callers await the same in-flight promise.
  let cached: Promise<UserContent> | null = null;
  const memoizedLoadPrefs = (): Promise<UserContent> => {
    if (cached) return cached;
    cached = loadPrefs();
    return cached;
  };

  // Memoize the profile beside loadPrefs: one derivation per run. Absent
  // thunk or failed/null derivation → prompt exactly as today (fail-open);
  // each case logs one warning.
  if (!deriveProfile) {
    console.warn(
      "[recommendations] no deriveProfile thunk supplied — building prompt without taste profile",
    );
  }
  let profileCache: Promise<string | null> | null = null;
  const memoizedProfile = (content: UserContent): Promise<string | null> => {
    if (!deriveProfile) return Promise.resolve(null);
    if (!profileCache) {
      profileCache = deriveProfile(content).then(
        (text) => text,
        (error) => {
          console.warn(
            "[recommendations] taste profile derivation failed — building prompt without it:",
            error,
          );
          return null;
        },
      );
    }
    return profileCache;
  };

  const runId = crypto.randomUUID();

  // Build generator list only for requested categories. Generators are
  // lazy — they only progress as raceMerge drains them.
  const generators = requested.map((category) => ({
    category,
    gen: backfillCategory({
      category,
      loadPrefs: memoizedLoadPrefs,
      profileFor: memoizedProfile,
      previousRecommendations,
      signal,
      runId,
    }),
  }));

  yield* raceMerge(generators, TARGET_PER_CATEGORY);
}
