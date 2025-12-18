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
    movies: z.array(z.object({ title: z.string(), year: z.number() })),
    tvs: z.array(z.object({ title: z.string(), year: z.number() })),
    dislikedMovies: z.array(z.object({ title: z.string(), year: z.number() })),
    dislikedTvs: z.array(z.object({ title: z.string(), year: z.number() })),
    actors: z.array(z.string()),
    directors: z.array(z.string()),
    genres: z.array(z.string()),
  }),
  previousRecommendations: z.array(
    z.object({
      title: z.string(),
      year: z.number(),
      category: z.enum(["movie", "tv"]),
    })
  ),
});

type EnrichRecommendationsInput = z.infer<typeof enrichRecommendationsSchema>;

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
    const searchPromises = recommendations.map((recommendation) => {
      if (recommendation.category === "movie") {
        // Use existing searchMoviesAPI function with proper year parameter
        return searchMoviesAPI({
          query: recommendation.title,
          primaryReleaseYear: recommendation.releasedYear,
          page: 1,
        })
          .then((result: any) => {
            // Get the first result if available
            const tmdbData =
              result.results.length > 0 ? result.results[0] : null;

            return {
              ...recommendation,
              tmdbData,
            };
          })
          .catch((error: any) => {
            console.error(
              `Failed to enrich recommendation "${recommendation.title}":`,
              error
            );
            return {
              ...recommendation,
              tmdbData: null,
            };
          });
      } else if (recommendation.category === "tv") {
        // Use existing searchTVsAPI function with proper year parameter
        return searchTVsAPI({
          query: recommendation.title,
          firstAirDateYear: recommendation.releasedYear,
          page: 1,
        })
          .then((result: any) => {
            // Get the first result if available
            const tmdbData =
              result.results.length > 0 ? result.results[0] : null;

            return {
              ...recommendation,
              tmdbData,
            };
          })
          .catch((error: any) => {
            console.error(
              `Failed to enrich recommendation "${recommendation.title}":`,
              error
            );
            return {
              ...recommendation,
              tmdbData: null,
            };
          });
      }

      // Fallback for any unexpected categories
      return Promise.resolve({
        ...recommendation,
        tmdbData: null,
      });
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

// Server function for route loaders
export const getRecommendations = createServerFn({
  method: "POST",
})
  .inputValidator(getRecommendationsSchema)
  .handler(async ({ data }) => {
    const { userPrefs, previousRecommendations } = data;

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
    };

    const models: LanguageModelV2[] = [googleModel, mistralModel];
    let modelIdx = 0;
    let result: AIRecommendationsResult | undefined;

    while (!result || (!result.success && modelIdx < models.length)) {
      const currentModel = models[modelIdx];
      result = await getAIRecommendations(args, currentModel);
      modelIdx++;
    }

    if (result.success && result.data) {
      // Enrich recommendations with TMDB data
      const enrichedRecommendations = await enrichRecommendationsWithTMDB(
        result.data.recommendations
      );
      return enrichedRecommendations;
    } else {
      const errorMsg =
        typeof result.error === "string"
          ? result.error
          : result.error?.message || "Failed to get recommendations";
      throw new Error(errorMsg);
    }
  });
