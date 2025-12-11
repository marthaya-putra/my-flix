import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";

import {
  addUserPreference,
  getUserPreferences,
  removeUserPreferenceByPreferenceId,
  schemas as preferenceSchemas,
} from "@/lib/repositories/user-preferences";
import { db, userPreferences } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  addUserPerson,
  getUserPeople,
  removeUserPerson,
  schemas as peopleSchemas,
} from "@/lib/repositories/user-people";
import { auth } from "../auth";
import { getUserDislikes } from "../repositories/user-dislikes";

// Input validation schemas from repositories
const AddMoviePreferenceInput = preferenceSchemas.addPreference.omit({
  userId: true,
});
const AddPersonPreferenceInput = peopleSchemas.addPerson.omit({ userId: true });
const RemovePreferenceInput = z.object({
  id: z.number(),
  type: z.enum(["movie", "tv-series"]),
});
const RemovePersonInput = z.object({
  id: z.number(),
  personType: z.enum(["actor", "director", "other"]),
});

// Add movie/TV show to user preferences
export const addMoviePreference = createServerFn({
  method: "POST",
})
  .inputValidator(AddMoviePreferenceInput)
  .handler(async ({ data }) => {
    try {
      const { preferenceId, title, year, category, genres, posterPath } = data;

      // Get the current session to retrieve authenticated user ID
      const session = await auth.api.getSession({
        headers: getRequest().headers,
      });

      if (!session?.user?.id) {
        return { success: false, error: "User not authenticated" };
      }

      const result = await addUserPreference({
        data: {
          userId: session.user.id,
          preferenceId,
          title,
          year,
          category,
          genres,
          posterPath,
        },
      });

      if (result.success && result.preference) {
        return { success: true, data: result.preference };
      } else {
        return { success: false, error: "Already in preferences" };
      }
    } catch (error) {
      console.error("Error adding movie preference:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add movie preference",
      };
    }
  });

// Remove movie/TV show from user preferences
export const removeMoviePreference = createServerFn({
  method: "POST",
})
  .inputValidator(RemovePreferenceInput)
  .handler(async ({ data }) => {
    try {
      const { id, type } = data;

      // Get the current session to retrieve authenticated user ID
      const session = await auth.api.getSession({
        headers: getRequest().headers,
      });

      if (!session?.user?.id) {
        return { success: false, error: "User not authenticated" };
      }

      // First get the preference to find the TMDB ID
      const preferenceToDelete = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.id, id))
        .limit(1);

      if (preferenceToDelete.length === 0) {
        return { success: false, error: "Preference not found" };
      }

      const preference = preferenceToDelete[0];

      // Use repository function to remove by TMDB ID
      const result = await removeUserPreferenceByPreferenceId({
        data: {
          userId: session.user.id,
          preferenceId: preference.preferenceId,
        },
      });

      if (result.success && result.deletedPreference) {
        return { success: true, data: result.deletedPreference };
      } else {
        return { success: false, error: "Failed to remove preference" };
      }
    } catch (error) {
      console.error("Error removing movie preference:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove movie preference",
      };
    }
  });

// Add person (actor/director) to user people
export const addPersonPreference = createServerFn({
  method: "POST",
})
  .inputValidator(AddPersonPreferenceInput)
  .handler(async ({ data }) => {
    try {
      const { personId, personName, personType, profilePath } = data;

      // Get the current session to retrieve authenticated user ID
      const session = await auth.api.getSession({
        headers: getRequest().headers,
      });

      if (!session?.user?.id) {
        return { success: false, error: "User not authenticated" };
      }

      const result = await addUserPerson({
        data: {
          userId: session.user.id,
          personId,
          personName,
          personType,
          profilePath,
        },
      });

      if (result.success && result.person) {
        return { success: true, data: result.person };
      } else {
        return { success: false, error: "Already in preferences" };
      }
    } catch (error) {
      console.error("Error adding person preference:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add person preference",
      };
    }
  });

// Remove person (actor/director) from user people
export const removePersonPreference = createServerFn({
  method: "POST",
})
  .inputValidator(RemovePersonInput)
  .handler(async ({ data }) => {
    try {
      const { id, personType } = data;

      // Get the current session to retrieve authenticated user ID
      const session = await auth.api.getSession({
        headers: getRequest().headers,
      });

      if (!session?.user?.id) {
        return { success: false, error: "User not authenticated" };
      }

      const result = await removeUserPerson({
        data: {
          id,
          userId: session.user.id,
        },
      });

      if (result.success && result.deletedPerson) {
        return { success: true, data: result.deletedPerson };
      } else {
        return { success: false, error: "Person not found" };
      }
    } catch (error) {
      console.error("Error removing person preference:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove person preference",
      };
    }
  });

// Fetch all user preferences for the preferences page
export const fetchUserPreferences = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const session = await auth.api.getSession({
      headers: getRequest().headers,
    });

    // Check if user is authenticated
    if (!session?.user?.id) {
      return {
        success: false,
        error: "User not authenticated",
        data: { movies: [], tvShows: [], people: [] },
      };
    }

    // Fetch movie and TV preferences using repository
    const movieTVResult = await getUserPreferences({
      data: {
        userId: session.user.id,
      },
    });

    // Fetch people preferences using repository
    const peopleResult = await getUserPeople({
      data: {
        userId: session.user.id,
      },
    });

    const movieTVPreferences = movieTVResult.success
      ? movieTVResult.preferences
      : [];
    const peoplePreferences = peopleResult.success ? peopleResult.people : [];

    // Separate movies and TV shows
    const movies = movieTVPreferences
      .filter((pref) => pref.category === "movie")
      .map((pref) => ({
        id: pref.preferenceId, // Use TMDB ID for display/search comparison
        dbId: pref.id, // Keep database ID for removal operations
        title: pref.title,
        category: "movie" as const,
        genreIds: [],
        genres: pref.genres
          ? pref.genres
              .split(",")
              .map((g) => g.trim())
              .filter(Boolean)
          : [],
        posterPath: pref.posterPath || "",
        backdropPath: "",
        overview: "",
        voteAverage: 0,
        releaseDate: pref.year?.toString() || "",
      }));

    const tvShows = movieTVPreferences
      .filter((pref) => pref.category === "tv-series")
      .map((pref) => ({
        id: pref.preferenceId, // Use TMDB ID for display/search comparison
        dbId: pref.id, // Keep database ID for removal operations
        title: pref.title,
        category: "tv" as const,
        genreIds: [],
        genres: pref.genres
          ? pref.genres
              .split(",")
              .map((g) => g.trim())
              .filter(Boolean)
          : [],
        posterPath: pref.posterPath || "",
        backdropPath: "",
        overview: "",
        voteAverage: 0,
        releaseDate: pref.year?.toString() || "",
      }));

    // Convert people preferences
    const people = peoplePreferences.map((pref) => ({
      id: pref.personId, // Use TMDB ID for display/search comparison
      dbId: pref.id, // Keep database ID for removal operations
      name: pref.personName,
      profileImageUrl: pref.profilePath || "",
      popularity: 0,
      knownFor: [],
      category: pref.personType,
    }));

    return {
      success: true,
      data: {
        movies,
        tvShows,
        people,
        favoriteGenres: [], // This would be stored separately in the future
        minRating: 6,
        preferredContent: {
          movie: true,
          tv: true,
        },
        notes: "",
      },
    };
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch user preferences",
      data: {
        movies: [],
        tvShows: [],
        people: [],
        favoriteGenres: [],
        minRating: 6,
        preferredContent: {
          movie: true,
          tv: true,
        },
        notes: "",
      },
    };
  }
});

// Helper function to add content from FilmInfo
export const addFilmInfoPreference = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      filmInfo: z.object({
        id: z.number(),
        title: z.string(),
        category: z.enum(["movie", "tv"]),
        genres: z.array(z.string()),
        releaseDate: z.string().optional(),
      }),
    })
  )
  .handler(async ({ data }) => {
    try {
      const { filmInfo } = data;
      const category = filmInfo.category === "tv" ? "tv-series" : "movie";
      const genres = filmInfo.genres.join(", ");
      const year = filmInfo.releaseDate
        ? new Date(filmInfo.releaseDate).getFullYear()
        : new Date().getFullYear();

      return await addMoviePreference({
        data: {
          preferenceId: filmInfo.id,
          title: filmInfo.title,
          year,
          category,
          genres: genres || undefined,
        },
      });
    } catch (error) {
      console.error("Error adding film info preference:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add film info preference",
      };
    }
  });

// Helper function to add content from Person
export const addPersonInfoPreference = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      person: z.object({
        id: z.number(),
        name: z.string(),
        knownForDepartment: z.string().optional(),
        profilePath: z.string().optional(),
      }),
      personType: z.enum(["actor", "director", "other"]),
    })
  )
  .handler(async ({ data }) => {
    try {
      const { person, personType } = data;

      return await addPersonPreference({
        data: {
          personId: person.id,
          personName: person.name,
          personType,
          profilePath: person.profilePath,
        },
      });
    } catch (error) {
      console.error("Error adding person info preference:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add person info preference",
      };
    }
  });

export const getAllUserContent = createServerFn().handler(async () => {
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
    const dislikes = dislikesResponse.success ? dislikesResponse.dislikes : [];

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
        category: d.category === "movie" ? ("movie" as const) : ("tv" as const),
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
