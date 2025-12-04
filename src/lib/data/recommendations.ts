import { createServerFn } from "@tanstack/react-start";
import { searchMovies, searchTVs } from "./search";

// Bulk search function to get TMDB data for multiple recommendations
export const enrichRecommendationsWithTMDB = createServerFn({
  method: "POST",
})
  .inputValidator(
    (
      recommendations: Array<{
        title: string;
        category: "movie" | "tv";
        releasedYear: number;
        reason: string;
      }>
    ) => recommendations
  )
  .handler(async ({ data }) => {
    // Create search promises for all recommendations without awaiting them
    const searchPromises = data.map((recommendation) => {
      if (recommendation.category === "movie") {
        // Use existing searchMovies function with proper year parameter
        return searchMovies({
          data: {
            query: recommendation.title,
            primaryReleaseYear: recommendation.releasedYear,
            page: 1
          },
        })
          .then((result) => {
            // Get the first result if available
            const tmdbData =
              result.results.length > 0 ? result.results[0] : null;

            return {
              ...recommendation,
              tmdbData,
            };
          })
          .catch((error) => {
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
        // Use existing searchTVs function with proper year parameter
        return searchTVs({
          data: {
            query: recommendation.title,
            firstAirDateYear: recommendation.releasedYear,
            page: 1
          },
        })
          .then((result) => {
            // Get the first result if available
            const tmdbData =
              result.results.length > 0 ? result.results[0] : null;

            return {
              ...recommendation,
              tmdbData,
            };
          })
          .catch((error) => {
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
  });
