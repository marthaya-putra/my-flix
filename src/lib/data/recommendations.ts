import { searchMoviesAPI, searchTVsAPI } from "./search";
import { getAIRecommendations } from "../ai/recommendations";
import { z } from "zod";
import { FilmInfo } from "../types";
import { googleModel, mistralModel } from "../ai/models";
import { LanguageModelV2 } from "@ai-sdk/provider";
import type { UserContent } from "./preferences";

// Re-export the wire types from the isolated module so server callers have
// one import path. The client imports directly from ./stream-events to
// avoid pulling server runtime code into the browser bundle.
export type {
  StreamEvent,
  StreamCategory,
  StreamStatus,
} from "./stream-events";
import type { StreamEvent, StreamCategory, StreamStatus } from "./stream-events";

// ---- Spec 0004 tuning constants (server-side deficit loop) ----
// Per-category target + over-ask buffer. Worst case = 2 sides × MAX_ROUNDS.
const TARGET_PER_CATEGORY = 3;
const MAX_ROUNDS = 5;
const OVERASK_BUFFER = 2;

type Category = StreamCategory;
type StatusCode = StreamStatus;

// Input validation schemas
const enrichRecommendationsSchema = z.array(
  z.object({
    title: z.string(),
    category: z.enum(["movie", "tv"]),
    releasedYear: z.number(),
    reason: z.string(),
    imdbRating: z.number(),
  })
);

type EnrichRecommendationsInput = z.infer<typeof enrichRecommendationsSchema>;

// Year-extract helper (handles both movie release_date and tv first_air_date).
function releaseYear(releaseDate: string): number | null {
  if (!releaseDate) return null;
  const y = parseInt(releaseDate.slice(0, 4), 10);
  return Number.isNaN(y) ? null : y;
}

// Search TMDB for a title+year. The LLM's year is often off-by-one
// (festival vs wide release) or otherwise slightly wrong, so an exact
// year match returns nothing. Strategy: try the exact year first; if that
// yields nothing, re-search without the year and pick the result whose
// year is closest to the requested one.
async function searchTitleWithYearFallback(
  title: string,
  category: "movie" | "tv",
  requestedYear: number
): Promise<FilmInfo | null> {
  const exact =
    category === "movie"
      ? await searchMoviesAPI({
          query: title,
          primaryReleaseYear: requestedYear,
          page: 1,
        })
      : await searchTVsAPI({
          query: title,
          firstAirDateYear: requestedYear,
          page: 1,
        });

  if (exact.results.length > 0) return exact.results[0];

  // Year-filtered search returned nothing — retry without the year and
  // pick the closest match by release year to avoid grabbing a wrong title.
  const loose =
    category === "movie"
      ? await searchMoviesAPI({ query: title, page: 1 })
      : await searchTVsAPI({ query: title, page: 1 });

  if (loose.results.length === 0) return null;

  const scored = loose.results
    .map((r) => {
      const y = releaseYear(r.releaseDate);
      return { r, dist: y === null ? Infinity : Math.abs(y - requestedYear) };
    })
    .sort((a, b) => a.dist - b.dist);

  return scored[0].r;
}

// Bulk search function to get TMDB data for multiple recommendations
export async function enrichRecommendationsWithTMDB(
  recommendations: EnrichRecommendationsInput
): Promise<
  Array<{
    title: string;
    category: "movie" | "tv";
    releasedYear: number;
    reason: string;
    imdbRating: number;
    tmdbData: FilmInfo | null;
  }>
> {
  try {
    // Create search promises for all recommendations without awaiting them
    const searchPromises = recommendations.map(async (recommendation) => {
      try {
        const tmdbData = await searchTitleWithYearFallback(
          recommendation.title,
          recommendation.category,
          recommendation.releasedYear
        );
        return { ...recommendation, tmdbData };
      } catch (error: any) {
        console.error(
          `Failed to enrich recommendation "${recommendation.title}":`,
          error
        );
        return { ...recommendation, tmdbData: null };
      }
    });

    // Fire all searches concurrently with Promise.all
    const enrichedRecommendations = await Promise.all(searchPromises);
    return enrichedRecommendations.filter(
      (rec): rec is NonNullable<typeof rec> => rec !== undefined
    );
  } catch (error) {
    console.error("Failed to enrich recommendations with TMDB data:", error);
    throw new Error("Failed to enrich recommendations");
  }
}

// Drop items with a failed TMDB lookup and items whose TMDB ID is in the
// exclude set (liked ∪ disliked). No ID → no sound filter, so drop them.
export function filterRecommendations(
  enriched: Awaited<ReturnType<typeof enrichRecommendationsWithTMDB>>,
  excludeIds: Set<number>
) {
  return enriched.filter((rec) => {
    if (!rec.tmdbData) return false;
    return !excludeIds.has(rec.tmdbData.id);
  });
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

// Per-category pipeline (Spec 0004). Owns its model-fallback chain, deficit
// loop (≤MAX_ROUNDS), TMDB enrichment fan-out, ID-filter accumulation, and
// terminal status classification. Yields item events then exactly one
// groupEnd. Any throw is converted to a generation_failed groupEnd so the
// survivor category is unaffected.
async function* backfillCategory(
  category: Category,
  baseArgs: CategoryArgs,
  excludeIds: Set<number>,
  models: LanguageModelV2[]
): AsyncGenerator<StreamEvent> {
  // Per-side accumulator: round-N survivors feed both the next round's
  // exclude set (TMDB IDs) and the LLM's previousRecommendations (titles).
  const localExcludeIds = new Set(excludeIds);
  const localPrevRecs = [...baseArgs.previousRecommendations];

  let totalSurvivors = 0;
  let totalRawProduced = 0;
  let totalEnrichFailures = 0;
  let allRoundsThrew = true;

  try {
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const deficit = TARGET_PER_CATEGORY - totalSurvivors;
      if (deficit <= 0) break;

      const ask = deficit + OVERASK_BUFFER;
      console.log(
        `[recommendations:${category}] round ${round} deficit=${deficit} ask=${ask} telling LLM to avoid ${localPrevRecs.length} titles: [${localPrevRecs.map((r) => r.title).join(", ")}]`
      );

      // Model-fallback chain (google → mistral). First success wins.
      type RawRec = {
        title: string;
        category: Category;
        releasedYear: number;
        reason: string;
        imdbRating: number;
      };
      let raw: RawRec[] = [];
      let roundThrew = true;
      for (let i = 0; i < models.length; i++) {
        const modelLabel = i === 0 ? "google" : "mistral";
        console.log(
          `[recommendations:${category}] round ${round} model ${i + 1}/${models.length}: ${modelLabel}`
        );
        const res = await getAIRecommendations(
          {
            ...baseArgs,
            previousRecommendations: localPrevRecs,
            requestedMovies: category === "movie" ? ask : 0,
            requestedTvs: category === "tv" ? ask : 0,
            onlyCategory: category,
          },
          models[i]
        );
        if (res.success && res.data) {
          // LLM may still emit the other category despite the prompt —
          // filter to this side only.
          raw = res.data.recommendations.filter(
            (r): r is RawRec => r.category === category
          );
          roundThrew = false;
          console.log(
            `[recommendations:${category}] round ${round} ${modelLabel} ok, raw=${raw.length}`
          );
          break;
        }
        console.warn(
          `[recommendations:${category}] round ${round} ${modelLabel} failed`
        );
      }
      if (!roundThrew) allRoundsThrew = false;

      // Criterion 6: round 1 returning 0 raw items (LLM emitted nothing)
      // is a hard generation failure — no point looping.
      if (round === 1 && !roundThrew && raw.length === 0) {
        yield { type: "groupEnd", category, status: "generation_failed" };
        return;
      }
      // Subsequent empty round: no progress, stop looping.
      if (raw.length === 0) break;

      totalRawProduced += raw.length;

      // Per-round reject breakdown (Spec 0005 diagnostic). Survivors +
      // excluded + enrichFail should reconcile to raw.
      let roundExcluded = 0;
      let roundEnrichFail = 0;
      let roundCapped = 0;

      // Fan out TMDB enrichment, yield survivors in input order as each
      // resolves (ordered await so later items don't block earlier yields).
      const enrichedPromises = raw.map(async (recommendation) => {
        try {
          const tmdbData = await searchTitleWithYearFallback(
            recommendation.title,
            recommendation.category,
            recommendation.releasedYear
          );
          return { ...recommendation, tmdbData };
        } catch (error: any) {
          console.error(
            `Failed to enrich recommendation "${recommendation.title}":`,
            error
          );
          return { ...recommendation, tmdbData: null };
        }
      });

      for (let i = 0; i < enrichedPromises.length; i++) {
        // Over-ask buffer is for resilience, not for yielding extras.
        // Stop as soon as the target is met.
        if (totalSurvivors >= TARGET_PER_CATEGORY) {
          roundCapped = enrichedPromises.length - i;
          break;
        }
        const rec = await enrichedPromises[i];
        if (!rec.tmdbData) {
          totalEnrichFailures++;
          roundEnrichFail++;
          continue;
        }
        if (localExcludeIds.has(rec.tmdbData.id)) {
          roundExcluded++;
          // Feed excluded titles (liked/disliked hits) back into
          // previousRecommendations so the next round's prompt's "Already
          // recommended" section grows — otherwise the LLM keeps
          // re-suggesting the same excluded titles every round and the
          // deficit loop never makes progress.
          localPrevRecs.push({
            id: rec.tmdbData.id,
            title: rec.title,
            year: rec.releasedYear,
            category,
          });
          continue;
        }
        totalSurvivors++;
        localExcludeIds.add(rec.tmdbData.id);
        localPrevRecs.push({
          id: rec.tmdbData.id,
          title: rec.title,
          year: rec.releasedYear,
          category,
        });
        yield { type: "item", rec: { ...rec, tmdbData: rec.tmdbData } };
      }
      console.log(
        `[recommendations:${category}] round ${round} reject breakdown: excluded=${roundExcluded} enrichFail=${roundEnrichFail} capped=${roundCapped} survivors_this_round_ended_at=${totalSurvivors} prevRecsFedToLLM=${localPrevRecs.length}`
      );
    }

    // Terminal status classification (acceptance criteria 4–6).
    let status: StatusCode;
    if (totalSurvivors > 0) {
      status = "ok";
    } else if (allRoundsThrew) {
      status = "generation_failed";
    } else if (totalRawProduced === 0) {
      status = "generation_failed";
    } else if (totalRawProduced === totalEnrichFailures) {
      status = "enrichment_empty";
    } else {
      status = "exhausted";
    }
    console.log(
      `[recommendations:${category}] groupEnd status=${status} survivors=${totalSurvivors} raw=${totalRawProduced} enrichFail=${totalEnrichFailures}`
    );
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

// Race-merge two category generators into one interleaved stream.
// Emits groupStart for both categories up front (so the client renders
// skeletons immediately), then forwards item + groupEnd events from
// whichever side resolves next. Each side's groupEnd is emitted exactly
// once (the generator guarantees it, even on throw).
async function* raceMerge(
  movieGen: AsyncGenerator<StreamEvent>,
  tvGen: AsyncGenerator<StreamEvent>
): AsyncGenerator<StreamEvent> {
  yield { type: "groupStart", category: "movie" };
  yield { type: "groupStart", category: "tv" };

  type Tagged = { cat: Category; result: IteratorResult<StreamEvent> };
  const nextTagged = (
    cat: Category,
    gen: AsyncGenerator<StreamEvent>
  ): Promise<Tagged> => gen.next().then((result) => ({ cat, result }));

  let movieDone = false;
  let tvDone = false;
  let moviePromise: Promise<Tagged> | null = nextTagged("movie", movieGen);
  let tvPromise: Promise<Tagged> | null = nextTagged("tv", tvGen);

  while (!movieDone || !tvDone) {
    const pending: Promise<Tagged>[] = [];
    if (moviePromise) pending.push(moviePromise);
    if (tvPromise) pending.push(tvPromise);

    const { cat, result } = await Promise.race(pending);

    if (cat === "movie") {
      if (result.done) {
        movieDone = true;
        moviePromise = null;
      } else {
        yield result.value;
        moviePromise = nextTagged("movie", movieGen);
      }
    } else {
      if (result.done) {
        tvDone = true;
        tvPromise = null;
      } else {
        yield result.value;
        tvPromise = nextTagged("tv", tvGen);
      }
    }
  }
}

// Input the NDJSON route accepts over the wire. The client sends ONLY
// previousRecommendations (transient shown-not-yet-liked state the server
// can't derive). userPrefs is loaded server-side from the DB via
// loadUserContent(userId) — never trusted from the client.
export const streamRequestSchema = z.object({
  previousRecommendations: z.array(
    z.object({
      id: z.number().optional(),
      title: z.string(),
      year: z.number(),
      category: z.enum(["movie", "tv"]),
    })
  ),
});
export type StreamRequest = z.infer<typeof streamRequestSchema>;

// Pure pipeline entry point (Spec 0006). Takes the server-authoritative
// userPrefs + previousRecommendations and drives raceMerge over two
// parallel backfillCategory generators. No transport concerns — the NDJSON
// route drains the yielded StreamEvents however it likes.
export async function* runPipelines(input: {
  userPrefs: UserContent;
  previousRecommendations: StreamRequest["previousRecommendations"];
}): AsyncGenerator<StreamEvent> {
  const { userPrefs, previousRecommendations } = input;

  const baseArgs: CategoryArgs = {
    previouslyLikedMovies: userPrefs.movies,
    previouslyLikedTvs: userPrefs.tvs,
    dislikedMovies: userPrefs.dislikedMovies,
    dislikedTvs: userPrefs.dislikedTvs,
    favoriteActors: userPrefs.actors,
    favoriteDirectors: userPrefs.directors,
    genres: userPrefs.genres,
    excludeAdult: true,
    previousRecommendations,
  };

  // Shared exclude set (liked ∪ disliked ∪ previous-shown). TMDB IDs are
  // globally unique, so a single set safely filters both categories.
  const excludeIds = new Set<number>();
  for (const list of [
    userPrefs.movies,
    userPrefs.tvs,
    userPrefs.dislikedMovies,
    userPrefs.dislikedTvs,
  ]) {
    for (const item of list) {
      if (typeof item.id === "number") excludeIds.add(item.id);
    }
  }
  for (const item of previousRecommendations) {
    if (typeof item.id === "number") excludeIds.add(item.id);
  }
  console.log(
    `[recommendations] excludeIds size=${excludeIds.size}`,
    [...excludeIds]
  );

  const models: LanguageModelV2[] = [googleModel, mistralModel];

  // Two independent parallel pipelines. Generators are lazy — they only
  // progress as raceMerge drains them, but both advance concurrently.
  const movieGen = backfillCategory("movie", baseArgs, excludeIds, models);
  const tvGen = backfillCategory("tv", baseArgs, excludeIds, models);

  yield* raceMerge(movieGen, tvGen);
}
