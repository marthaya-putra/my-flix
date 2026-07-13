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
  StreamStage,
} from "./stream-events";
import type { StreamEvent, StreamCategory, StreamStatus, StreamStage } from "./stream-events";

// ---- Spec 0004 tuning constants (server-side deficit loop) ----
// Per-category target + over-ask buffer. Worst case = 2 sides × MAX_ROUNDS.
const TARGET_PER_CATEGORY = 3;
const MAX_ROUNDS = 5;
const OVERASK_BUFFER = 2;

type Category = StreamCategory;

// The LLM's raw recommendation before TMDB lookup.
type RawRec = {
  title: string;
  category: Category;
  releasedYear: number;
  reason: string;
  imdbRating: number;
};

// A RawRec after its TMDB lookup attempt. tmdbData is null on lookup
// failure (search returned nothing, or the search threw).
type EnrichedRec = RawRec & { tmdbData: FilmInfo | null };

// A labelled model in the fallback chain. The label flows into logs so the
// chain is self-describing rather than relying on array index.
type ModelEntry = { label: string; model: LanguageModelV2 };

// Year-extract helper (handles both movie release_date and tv first_air_date).
function releaseYear(releaseDate: string): number | null {
  if (!releaseDate) return null;
  const y = parseInt(releaseDate.slice(0, 4), 10);
  return Number.isNaN(y) ? null : y;
}

// Per-category TMDB search adapter. Replaces the repeated
// `category === "movie" ? searchMoviesAPI : searchTVsAPI` ternary that
// appeared at both the exact-year and loose-year search sites.
const categorySearch: Record<
  Category,
  (query: string, year?: number) => Promise<{ results: FilmInfo[] }>
> = {
  movie: (query, year) =>
    searchMoviesAPI({ query, primaryReleaseYear: year, page: 1 }),
  tv: (query, year) =>
    searchTVsAPI({ query, firstAirDateYear: year, page: 1 }),
};

// Search TMDB for a title+year. The LLM's year is often off-by-one
// (festival vs wide release) or otherwise slightly wrong, so an exact
// year match returns nothing. Strategy: try the exact year first; if that
// yields nothing, re-search without the year and pick the result whose
// year is closest to the requested one.
async function searchTitleWithYearFallback(
  title: string,
  category: Category,
  requestedYear: number
): Promise<FilmInfo | null> {
  const exact = await categorySearch[category](title, requestedYear);
  if (exact.results.length > 0) return exact.results[0];

  // Year-filtered search returned nothing — retry without the year and
  // pick the closest match by release year to avoid grabbing a wrong title.
  const loose = await categorySearch[category](title);
  if (loose.results.length === 0) return null;

  const scored = loose.results
    .map((r) => {
      const y = releaseYear(r.releaseDate);
      return { r, dist: y === null ? Infinity : Math.abs(y - requestedYear) };
    })
    .sort((a, b) => a.dist - b.dist);

  return scored[0].r;
}

// Enrich one raw recommendation with its TMDB data. A lookup failure never
// throws outwards — it resolves to tmdbData: null so the caller can count
// it as an enrich failure and keep draining the round.
async function enrichOne(rec: RawRec): Promise<EnrichedRec> {
  try {
    const tmdbData = await searchTitleWithYearFallback(
      rec.title,
      rec.category,
      rec.releasedYear
    );
    return { ...rec, tmdbData };
  } catch (error) {
    console.error(`Failed to enrich recommendation "${rec.title}":`, error);
    return { ...rec, tmdbData: null };
  }
}

// Drive the model-fallback chain (google → mistral). Returns the first
// model's category-scoped raw recs, or { raw: [], threw: true } if every
// model failed. `threw` distinguishes "LLM emitted nothing successfully"
// (raw empty, threw false) from "all models errored" (raw empty, threw true)
// — the deficit loop treats them differently.
async function fetchWithModelFallback(
  args: Parameters<typeof getAIRecommendations>[0],
  models: ModelEntry[],
  category: Category,
  round: number
): Promise<{ raw: RawRec[]; threw: boolean }> {
  for (let i = 0; i < models.length; i++) {
    const { label, model } = models[i];
    console.log(
      `[recommendations:${category}] round ${round} model ${i + 1}/${models.length}: ${label}`
    );
    const res = await getAIRecommendations(args, model);
    if (res.success && res.data) {
      // LLM may still emit the other category despite the prompt —
      // filter to this side only.
      const raw = res.data.recommendations.filter(
        (r): r is RawRec => r.category === category
      );
      console.log(
        `[recommendations:${category}] round ${round} ${label} ok, raw=${raw.length}`
      );
      return { raw, threw: false };
    }
    console.warn(
      `[recommendations:${category}] round ${round} ${label} failed`
    );
  }
  return { raw: [], threw: true };
}

// Terminal status classification (acceptance criteria 4–6). Pure: maps the
// pipeline's accumulated counters onto exactly one StreamStatus. Kept out
// of backfillCategory so the rules are legible and unit-testable.
function classifyStatus(s: {
  survivors: number;
  allRoundsThrew: boolean;
  rawProduced: number;
  enrichFailures: number;
}): StreamStatus {
  if (s.survivors > 0) return "ok";
  if (s.allRoundsThrew || s.rawProduced === 0) return "generation_failed";
  if (s.rawProduced === s.enrichFailures) return "enrichment_empty";
  return "exhausted";
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

// Per-category pipeline (Spec 0004 + 0011). Drives the deficit loop
// (≤MAX_ROUNDS) and yields StreamEvents in order: loading_preferences →
// finding_titles → looking_up_posters → interleaved item/progress →
// finalizing → exactly one groupEnd. Delegates the model-fallback chain,
// single-item enrichment, and terminal status classification to their
// helpers so this body reads as a recipe.
async function* backfillCategory(
  category: Category,
  loadPrefs: () => Promise<UserContent>,
  previousRecommendations: CategoryArgs["previousRecommendations"],
  models: ModelEntry[]
): AsyncGenerator<StreamEvent> {
  let totalSurvivors = 0;
  let totalRawProduced = 0;
  let totalEnrichFailures = 0;
  let allRoundsThrew = true;

  // Build a progress event for the current pipeline state (Spec 0007).
  const progress = (stage: StreamStage): StreamEvent => ({
    type: "progress",
    category,
    stage,
    found: totalSurvivors,
  });

  try {
    // Spec 0011: yield loading_preferences first, before any await,
    // so the client shows status during the DB fetch.
    yield progress("loading_preferences");

    const userPrefs = await loadPrefs();

    // Build baseArgs + excludeIds from the shared userPrefs (moved from
    // runPipelines — see Spec 0011). Each generator builds its own copies;
    // they're identical at construction; divergence happens as each
    // category's localExcludeIds grows.
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

    const localExcludeIds = new Set<number>([
      ...userPrefs.movies.map((m) => m.id),
      ...userPrefs.tvs.map((t) => t.id),
      ...userPrefs.dislikedMovies.map((m) => m.id),
      ...userPrefs.dislikedTvs.map((t) => t.id),
      ...previousRecommendations.map((r) => r.id).filter((id): id is number => typeof id === "number"),
    ]);

    const localPrevRecs = [...previousRecommendations];

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const deficit = TARGET_PER_CATEGORY - totalSurvivors;
      if (deficit <= 0) break;

      const ask = deficit + OVERASK_BUFFER;
      console.log(
        `[recommendations:${category}] round ${round} deficit=${deficit} ask=${ask} telling LLM to avoid ${localPrevRecs.length} titles: [${localPrevRecs.map((r) => r.title).join(", ")}]`
      );

      yield progress("finding_titles");

      const { raw, threw: roundThrew } = await fetchWithModelFallback(
        {
          ...baseArgs,
          previousRecommendations: localPrevRecs,
          requestedMovies: category === "movie" ? ask : 0,
          requestedTvs: category === "tv" ? ask : 0,
          onlyCategory: category,
        },
        models,
        category,
        round
      );
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

      // Emit progress before the TMDB enrichment fan-out.
      yield progress("looking_up_posters");

      // Per-round reject breakdown (Spec 0005 diagnostic). Survivors +
      // excluded + enrichFail should reconcile to raw.
      let roundExcluded = 0;
      let roundEnrichFail = 0;
      let roundCapped = 0;

      // Fan out enrichment, then await in input order so survivors yield as
      // they resolve without later items blocking earlier yields.
      const enrichedPromises = raw.map(enrichOne);

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
        // Tick progress so the count updates live as items land.
        yield progress("looking_up_posters");
      }
      console.log(
        `[recommendations:${category}] round ${round} reject breakdown: excluded=${roundExcluded} enrichFail=${roundEnrichFail} capped=${roundCapped} survivors_this_round_ended_at=${totalSurvivors} prevRecsFedToLLM=${localPrevRecs.length}`
      );
    }

    // Emit finalizing before terminal status classification.
    yield progress("finalizing");

    const status = classifyStatus({
      survivors: totalSurvivors,
      allRoundsThrew,
      rawProduced: totalRawProduced,
      enrichFailures: totalEnrichFailures,
    });
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

// Race-merge N category generators into one interleaved stream.
// Emits groupStart for each category up front (so the client renders
// skeletons immediately), then forwards events from whichever generator
// resolves next. Each generator's groupEnd is emitted exactly once (the
// generator guarantees it, even on throw).
async function* raceMerge(
  generators: { category: Category; gen: AsyncGenerator<StreamEvent> }[],
  target: number
): AsyncGenerator<StreamEvent> {
  if (generators.length === 0) return;

  // Emit groupStart for every requested category up front.
  for (const { category } of generators) {
    yield { type: "groupStart", category, target };
  }

  type Tagged = { cat: Category; result: IteratorResult<StreamEvent> };
  const nextTagged = (
    cat: Category,
    gen: AsyncGenerator<StreamEvent>
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
    })
  ),
});
export type StreamRequest = z.infer<typeof streamRequestSchema>;

// Resolve the category list from an optional raw array. Undefined or empty
// = both categories (backward compatible). Dedupes to avoid running the same
// pipeline twice. Exported so the route error handler can reuse the same
// resolution without re-deriving it.
const ALL_CATEGORIES: Category[] = ["movie", "tv"];
export function resolveCategories(
  raw?: Category[]
): Category[] {
  return !raw || raw.length === 0
    ? ALL_CATEGORIES
    : [...new Set(raw)];
}

// Pipeline entry point (Spec 0006 + 0011). Takes a lazy loadPrefs thunk
// + previousRecommendations and drives raceMerge over the requested
// category generators. The loadPrefs call is memoized so exactly one DB
// round-trip occurs regardless of category count. No transport concerns —
// the NDJSON route drains the yielded StreamEvents however it likes.
export async function* runPipelines(input: {
  loadPrefs: () => Promise<UserContent>;
  previousRecommendations: StreamRequest["previousRecommendations"];
  categories?: Category[];
}): AsyncGenerator<StreamEvent> {
  const { loadPrefs, previousRecommendations, categories: rawCategories } = input;

  const requested = resolveCategories(rawCategories);

  // Memoize loadPrefs: first caller triggers the single DB round-trip;
  // subsequent callers await the same in-flight promise.
  let cached: Promise<UserContent> | null = null;
  const memoizedLoadPrefs = (): Promise<UserContent> => {
    if (cached) return cached;
    cached = loadPrefs();
    return cached;
  };

  const models: ModelEntry[] = [
    { label: "google", model: googleModel },
    { label: "mistral", model: mistralModel },
  ];

  // Build generator list only for requested categories. Generators are
  // lazy — they only progress as raceMerge drains them.
  const generators = requested.map((category) => ({
    category,
    gen: backfillCategory(category, memoizedLoadPrefs, previousRecommendations, models),
  }));

  yield* raceMerge(generators, TARGET_PER_CATEGORY);
}
