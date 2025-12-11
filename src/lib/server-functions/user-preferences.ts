import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import {
  getUserPreferences,
} from "@/lib/repositories/user-preferences";
import {
  getUserDislikes,
} from "@/lib/repositories/user-dislikes";
import { getUserPeople } from "@/lib/repositories/user-people";

// Server function to load user preferences
export const loadUserPreferencesFn = createServerFn()
  .handler(async () => {
    // Get the current session to retrieve authenticated user ID
    const session = await auth.api.getSession({
      headers: getRequest().headers,
    });

    // If no session, return empty preferences
    if (!session?.user?.id) {
      return {
        movies: [],
        tvs: [],
        dislikedContent: [],
        actors: [],
        directors: [],
        genres: [],
      };
    }

    const userId = session.user.id;

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