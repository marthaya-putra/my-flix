import { createServerFn } from "@tanstack/react-start";
import { searchMoviesAPI, searchTVsAPI } from "./search";
import {
  AIRecommendationsResult,
  getAIRecommendations,
} from "../ai/recommendations";
import { z } from "zod";
import { FilmInfo } from "../types";
import { googleModel, mistralModel } from "../ai/models";
import { LanguageModelV2 } from "@ai-sdk/provider";

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

const getRecommendationsSchema = z.object({
  userPrefs: z.object({
    movies: z.array(
      z.object({ id: z.number().optional(), title: z.string(), year: z.number() })
    ),
    tvs: z.array(
      z.object({ id: z.number().optional(), title: z.string(), year: z.number() })
    ),
    dislikedMovies: z.array(
      z.object({ id: z.number().optional(), title: z.string(), year: z.number() })
    ),
    dislikedTvs: z.array(
      z.object({ id: z.number().optional(), title: z.string(), year: z.number() })
    ),
    actors: z.array(z.string()),
    directors: z.array(z.string()),
    genres: z.array(z.string()),
  }),
  previousRecommendations: z.array(
    z.object({
      id: z.number().optional(),
      title: z.string(),
      year: z.number(),
      category: z.enum(["movie", "tv"]),
    })
  ),
  requestedMovies: z.number().int().min(0).default(3),
  requestedTvs: z.number().int().min(0).default(3),
});

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

// Streaming server function (Spec 0003). Async generator: iterates the
// batch LLM output, enriches each item with TMDB, runs the 0001 filter
// (tmdbData null-check + exclude-ID check) per-item, and yields each
// survivor the instant its enrichment resolves. LLM call stays a single
// batch generateObject — the latency win is in TMDB enrichment fan-out.
export const getRecommendationsStream = createServerFn({ method: "POST" })
  .inputValidator(getRecommendationsSchema)
  .handler(async function* ({ data }) {
    const {
      userPrefs,
      previousRecommendations,
      requestedMovies,
      requestedTvs,
    } = data;

    const args = {
      previouslyLikedMovies: userPrefs.movies,
      previouslyLikedTvs: userPrefs.tvs,
      dislikedMovies: userPrefs.dislikedMovies,
      dislikedTvs: userPrefs.dislikedTvs,
      favoriteActors: userPrefs.actors,
      favoriteDirectors: userPrefs.directors,
      genres: userPrefs.genres,
      excludeAdult: true,
      previousRecommendations,
      requestedMovies,
      requestedTvs,
    };

    const models: LanguageModelV2[] = [googleModel, mistralModel];
    let result: AIRecommendationsResult | undefined;

    for (let i = 0; i < models.length; i++) {
      const modelLabel = i === 0 ? "google" : "mistral";
      console.log(
        `[recommendations] trying model ${i + 1}/${models.length}: ${modelLabel}`
      );
      result = await getAIRecommendations(args, models[i]);
      if (result.success) {
        console.log(`[recommendations] model ${modelLabel} succeeded`);
        break;
      }
      console.warn(
        `[recommendations] model ${modelLabel} failed, falling back...`
      );
    }

    if (!result?.success || !result.data) {
      const err = result?.error;
      const errorMsg =
        typeof err === "string"
          ? err
          : err?.message || "Failed to get recommendations (all models failed)";
      throw new Error(errorMsg);
    }

    const raw = result.data.recommendations;
    console.log(
      `[recommendations] LLM returned ${raw.length} (asked m=${requestedMovies} t=${requestedTvs})`,
      raw.map((r) => `${r.category}:${r.title}(${r.releasedYear})`)
    );

    // Build exclude set once (liked ∪ disliked ∪ previous-shown), before
    // enrichment. Does not depend on survivor results.
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

    // Fire all TMDB enrichments concurrently (fan-out), then yield survivors
    // in input order as each resolves. Ordered await so later items don't
    // block earlier yields, but yields still happen one at a time.
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

    let survivors = 0;
    for (let i = 0; i < enrichedPromises.length; i++) {
      const rec = await enrichedPromises[i];
      if (!rec.tmdbData) continue;
      if (excludeIds.has(rec.tmdbData.id)) continue;
      survivors++;
      yield rec;
    }
    console.log(`[recommendations] survivors=${survivors}`);
  });
