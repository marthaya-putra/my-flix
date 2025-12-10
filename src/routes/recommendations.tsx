import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { Await } from "@tanstack/react-router";
import { getRecommendations } from "@/lib/ai/recommendations";
import {
  getUserPreferences,
} from "@/lib/repositories/user-preferences";
import {
  getUserDislikes,
} from "@/lib/repositories/user-dislikes";
import { getUserPeople } from "@/lib/repositories/user-people";
import { enrichRecommendationsWithTMDB } from "@/lib/data/recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilmInfo } from "@/lib/types";
import { Recommendations as RecommendationsList } from "@/components/recommendations";
import { RecommendationCardSkeleton } from "@/components/recommendation-card-skeleton";
import { z } from "zod";

// Server function to load user preferences
const loadUserPreferencesFn = createServerFn()
  .handler(async () => {
    const userId = "default-user";

    try {
      const [preferencesResponse, peopleResponse, dislikesResponse] =
        await Promise.all([
          getUserPreferences({ data: { userId } }),
          getUserPeople({ data: { userId } }),
          getUserDislikes({ data: { userId } }),
        ]);

      const preferences = preferencesResponse.success
        ? preferencesResponse.preferences
        : [];
      const people = peopleResponse.success ? peopleResponse.people : [];
      const dislikes = dislikesResponse.success
        ? dislikesResponse.dislikes
        : [];

      // Extract genres from preferences
      const allGenres = preferences
        .filter((p) => p.genres)
        .map((p) => p.genres!.split(",").map((genre) => genre.trim()))
        .flat()
        .filter((genre) => genre.length > 0);

      // Remove duplicates
      const uniqueGenres = [...new Set(allGenres)];

      return {
        movies: preferences
          .filter((p) => p.category === "movie")
          .map((p) => ({
            title: p.title,
            year: p.year,
          })),
        tvs: preferences
          .filter((p) => p.category === "tv-series")
          .map((p) => ({
            title: p.title,
            year: p.year,
          })),
        dislikedContent: dislikes.map((d) => ({
          title: d.title,
          year: d.year,
          category:
            d.category === "movie" ? ("movie" as const) : ("tv" as const),
        })),
        actors: people
          .filter((p) => p.personType === "actor")
          .map((p) => p.personName),
        directors: people
          .filter((p) => p.personType === "director")
          .map((p) => p.personName),
        genres: uniqueGenres,
      };
    } catch (error) {
      console.error("Failed to load user preferences:", error);
      return {
        movies: [],
        tvs: [],
        dislikedContent: [],
        actors: [],
        directors: [],
        genres: [],
      };
    }
  });

// Input schema for recommendations
const GetRecommendationsInput = z.object({
  userPrefs: z.object({
    movies: z.array(z.object({ title: z.string(), year: z.number() })),
    tvs: z.array(z.object({ title: z.string(), year: z.number() })),
    dislikedContent: z.array(z.object({
      title: z.string(),
      year: z.number(),
      category: z.enum(["movie", "tv"])
    })),
    actors: z.array(z.string()),
    directors: z.array(z.string()),
    genres: z.array(z.string()),
  }),
  previousRecommendations: z.array(z.object({
    title: z.string(),
    year: z.number(),
    category: z.enum(["movie", "tv"]),
  })).optional(),
});

// Server function to get recommendations
const getRecommendationsFn = createServerFn({
  method: "POST",
})
  .inputValidator(GetRecommendationsInput)
  .handler(async ({ data }) => {
    const { userPrefs, previousRecommendations = [] } = data;

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

export const Route = createFileRoute("/recommendations")({
  component: Recommendations,
  loader: async () => {
    // Load user preferences
    const userPrefs = await loadUserPreferencesFn();

    // Get initial recommendations
    const recommendations = getRecommendationsFn({
      data: {
        userPrefs,
        previousRecommendations: []
      }
    });

    return {
      userPrefs,
      recommendations,
    };
  },
});

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  tmdbData: FilmInfo | null;
}

function Recommendations() {
  const { userPrefs, recommendations } = Route.useLoaderData();

  const handleLoadMore = async (): Promise<Recommendation[]> => {
    const result = await getRecommendationsFn({
      data: {
        userPrefs,
        previousRecommendations: []
      }
    });
    return result;
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl mt-8">
      <Card>
        <CardHeader>
          <CardTitle>AI Movie/TV Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Suspense fallback={<RecommendationCardSkeleton />}>
            <Await
              promise={recommendations}
              children={(data: Recommendation[]) => (
                <RecommendationsList
                  recommendations={data}
                  userPrefs={userPrefs}
                  onLoadMore={handleLoadMore}
                  error={null}
                />
              )}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}