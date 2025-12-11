import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRecommendations } from "@/lib/ai/recommendations";
import { enrichRecommendationsWithTMDB } from "@/lib/data/recommendations";

// Shared server function to get recommendations (reusable for initial and load more)
export const getRecommendationsFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      userPrefs: z.object({
        movies: z.array(z.object({ title: z.string(), year: z.number() })),
        tvs: z.array(z.object({ title: z.string(), year: z.number() })),
        dislikedContent: z.array(
          z.object({
            title: z.string(),
            year: z.number(),
            category: z.enum(["movie", "tv"]),
          })
        ),
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
    })
  )
  .handler(async ({ data }) => {
    const { userPrefs, previousRecommendations } = data;

    try {
      const result = await getRecommendations({
        data: {
          previouslyLikedMovies: userPrefs.movies,
          previouslyLikedTvs: userPrefs.tvs,
          dislikedContent: userPrefs.dislikedContent,
          favoriteActors: userPrefs.actors,
          favoriteDirectors: userPrefs.directors,
          genres: userPrefs.genres,
          excludeAdult: true,
          previousRecommendations,
        },
      });

      if (result.success) {
        // Enrich recommendations with TMDB data
        const enrichedRecommendations = await enrichRecommendationsWithTMDB({
          data: result.data.recommendations,
        });
        return enrichedRecommendations;
      } else {
        throw new Error(result.error || "Failed to get recommendations");
      }
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      throw error;
    }
  });
