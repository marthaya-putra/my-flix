// Issue #78 / CODING_STANDARDS.md §7: every server fn here THROWS on
// failure. No `{ success, error }` shape, no silent catch→empty-data.
// TanStack Router's errorComponent renders thrown errors; mutations
// roll back via the optimistic hooks' onError. Callers that recover
// locally wrap the call in try/catch.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, userPreferences } from "@/lib/db";
import {
  addUserPerson,
  getUserPeople,
  schemas as peopleSchemas,
  removeUserPerson,
} from "@/lib/repositories/user-people";
import {
  addUserPreference,
  getUserPreferences,
  schemas as preferenceSchemas,
  removeUserPreferenceByPreferenceId as removeUserPreferenceByPreferenceIdRepo,
} from "@/lib/repositories/user-preferences";
import type { UserPreferences } from "@/lib/types/preferences";
import { WATCHLIST_PAGE_SIZE } from "@/lib/utils";
import { auth } from "../auth";
import {
  addUserDislike,
  getUserDislikes,
  removeUserDislikeByPreferenceId,
} from "../repositories/user-dislikes";
import {
  addUserWatchlist,
  countUserWatchlist,
  getUserWatchlist,
  removeUserWatchlistByWatchListId,
} from "../repositories/user-watchlist";

// Input validation schemas from repositories
const AddMoviePreferenceInput = preferenceSchemas.addPreference.omit({
  userId: true,
});
const AddPersonPreferenceInput = peopleSchemas.addPerson.omit({ userId: true });
const RemovePreferenceInput = z.object({
  id: z.number(),
  type: z.enum(["movie", "tv-series"]),
});
const RemovePreferenceByPreferenceIdInput = z.object({
  preferenceId: z.number(),
});
const RemovePersonInput = z.object({
  id: z.number(),
  personType: z.enum(["actor", "director", "other"]),
});

// Resolve the authenticated user id from the request, or throw. Reused by
// every fn below so the auth check reads once and throws a single error
// type ("User not authenticated") that errorComponent renders uniformly.
async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  });
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }
  return session.user.id;
}

// Empty UserPreferences — the legit "new user / nothing stored" shape.
// Used by fetchUserPreferences when the user is genuinely unauthenticated
// (a real state, not an error). DB read failures throw, not return this.
const EMPTY_USER_PREFERENCES: UserPreferences = {
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
};

// Add movie/TV show to user preferences
export const addMoviePreference = createServerFn({
  method: "POST",
})
  .inputValidator(AddMoviePreferenceInput)
  .handler(async ({ data }) => {
    const { preferenceId, title, year, category, genres, posterPath } = data;
    const userId = await requireUserId();

    const db = getDb();
    const result = await addUserPreference(db, {
      userId,
      preferenceId,
      title,
      year,
      category,
      genres,
      posterPath,
    });

    return result.preference;
  });

// Remove movie/TV show from user preferences
export const removeMoviePreference = createServerFn({
  method: "POST",
})
  .inputValidator(RemovePreferenceInput)
  .handler(async ({ data }) => {
    const db = getDb();
    const { id } = data;
    const userId = await requireUserId();

    // First get the preference to find the TMDB ID
    const preferenceToDelete = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.id, id))
      .limit(1);

    if (preferenceToDelete.length === 0) {
      throw new Error("Preference not found");
    }

    const preference = preferenceToDelete[0];

    // Use repository function to remove by TMDB ID
    const result = await removeUserPreferenceByPreferenceIdRepo(db, {
      userId,
      preferenceId: preference.preferenceId,
    });

    if (!result.deletedPreference) {
      throw new Error("Failed to remove preference");
    }
    return result.deletedPreference;
  });

// Add person (actor/director) to user people
export const addPersonPreference = createServerFn({
  method: "POST",
})
  .inputValidator(AddPersonPreferenceInput)
  .handler(async ({ data }) => {
    const { personId, personName, personType, profilePath } = data;
    const userId = await requireUserId();

    const db = getDb();
    const result = await addUserPerson(db, {
      userId,
      personId,
      personName,
      personType,
      profilePath,
    });

    return result.person;
  });

// Remove person (actor/director) from user people
export const removePersonPreference = createServerFn({
  method: "POST",
})
  .inputValidator(RemovePersonInput)
  .handler(async ({ data }) => {
    const { id } = data;
    const userId = await requireUserId();

    const db = getDb();
    const result = await removeUserPerson(db, {
      id,
      userId,
    });

    if (!result.deletedPerson) {
      throw new Error("Person not found");
    }
    return result.deletedPerson;
  });

// Fetch all user preferences for the preferences page
export const fetchUserPreferences = createServerFn({
  method: "GET",
}).handler(async (): Promise<UserPreferences> => {
  // Unauthenticated is a real state (public view) — return the empty
  // profile. Authenticated users with a DB read failure throw — no silent
  // empty-data mask (Issue #78).
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  });
  if (!session?.user?.id) {
    return { ...EMPTY_USER_PREFERENCES };
  }

  const db = getDb();
  const [movieTVResult, peopleResult] = await Promise.all([
    getUserPreferences(db, { userId: session.user.id }),
    getUserPeople(db, { userId: session.user.id }),
  ]);

  const movieTVPreferences = movieTVResult.preferences;
  const peoplePreferences = peopleResult.people;

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
      contentType: "movie" as const, // Add contentType to match ContentItem type
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
      contentType: "tv" as const, // Add contentType to match ContentItem type
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
    contentType: "person" as const, // Add contentType to match ContentItem type
  }));

  // Return UserPreferences directly
  return {
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
  };
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
    }),
  )
  .handler(async ({ data }) => {
    const { filmInfo } = data;
    const category = filmInfo.category === "tv" ? "tv-series" : "movie";
    const genres = filmInfo.genres.join(", ");
    const year = filmInfo.releaseDate
      ? new Date(filmInfo.releaseDate).getFullYear()
      : new Date().getFullYear();

    return addMoviePreference({
      data: {
        preferenceId: filmInfo.id,
        title: filmInfo.title,
        year,
        category,
        genres: genres || undefined,
      },
    });
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
    }),
  )
  .handler(async ({ data }) => {
    const { person, personType } = data;

    return addPersonPreference({
      data: {
        personId: person.id,
        personName: person.name,
        personType,
        profilePath: person.profilePath,
      },
    });
  });

// Toggle a dislike (add if absent, remove if present). Parallel to
// toggleMoviePreference but for the user_dislikes table. Returns the action
// taken ("added" | "removed") so the optimistic hook can reconcile. Throws on
// auth/DB failure — the hook rolls back via onError.
export const toggleDislike = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      preferenceId: z.number(),
      title: z.string(),
      year: z.number(),
      category: z.enum(["movie", "tv-series"]),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const db = getDb();
    const { preferenceId, title, year, category } = data;

    // Check if already disliked
    const existingResult = await getUserDislikes(db, {
      userId,
    });

    const existing = existingResult.dislikes.find(
      (d) => d.preferenceId === preferenceId,
    );

    if (existing) {
      // Remove the dislike
      await removeUserDislikeByPreferenceId(db, {
        userId,
        preferenceId,
      });
      return { action: "removed" as const };
    }

    // Add the dislike
    await addUserDislike(db, {
      userId,
      preferenceId,
      title,
      year,
      category,
    });
    return { action: "added" as const };
  });

// Remove content from user dislikes
export const removeUserDislikeByPreferenceIdFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      preferenceId: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const { preferenceId } = data;
    const userId = await requireUserId();

    const db = getDb();
    const result = await removeUserDislikeByPreferenceId(db, {
      userId,
      preferenceId,
    });

    return result.deletedDislike;
  });

// Remove movie/TV show from user preferences by preferenceId
export const removeUserPreferenceByPreferenceId = createServerFn({
  method: "POST",
})
  .inputValidator(RemovePreferenceByPreferenceIdInput)
  .handler(async ({ data }) => {
    const db = getDb();
    const { preferenceId } = data;
    const userId = await requireUserId();

    // Use repository function to remove by preference ID
    const result = await removeUserPreferenceByPreferenceIdRepo(db, {
      userId,
      preferenceId,
    });

    if (!result.deletedPreference) {
      throw new Error("Failed to remove preference");
    }
    return result.deletedPreference;
  });

// Get user's liked items (preferenceIds)
export const getUserLikedItems = createServerFn({
  method: "GET",
}).handler(async (): Promise<{ likedIds: number[] }> => {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  });
  // Unauthenticated = empty list (no liked items to seed). A DB failure
  // throws — the optimistic fill on the client relies on this being either
  // truthful or absent, never a stale empty mask.
  if (!session?.user?.id) {
    return { likedIds: [] };
  }

  const db = getDb();
  const result = await getUserPreferences(db, {
    userId: session.user.id,
  });
  return { likedIds: result.preferences.map((p) => p.preferenceId) };
});

// Get user's disliked items (preferenceIds). Parallel to getUserLikedItems —
// used to seed the disliked-items Set on /recommendations/ so the client and
// server agree before the first dislike toggle.
export const getUserDislikedItems = createServerFn({
  method: "GET",
}).handler(async (): Promise<{ dislikedIds: number[] }> => {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  });
  if (!session?.user?.id) {
    return { dislikedIds: [] };
  }

  const db = getDb();
  const result = await getUserDislikes(db, {
    userId: session.user.id,
  });
  return { dislikedIds: result.dislikes.map((d) => d.preferenceId) };
});

// Toggle movie/TV show preference (add if not liked, remove if liked).
// Returns the action taken ("added" | "removed") so the optimistic hook can
// reconcile. Throws on auth/DB failure — the hook rolls back via onError.
export const toggleMoviePreference = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      preferenceId: z.number(),
      title: z.string(),
      year: z.number(),
      category: z.enum(["movie", "tv-series"]),
      genres: z.array(z.string()).optional(),
      posterPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const db = getDb();
    const { preferenceId, title, year, category, genres, posterPath } = data;

    // Check if already liked
    const existingResult = await getUserPreferences(db, {
      userId,
    });

    const existing = existingResult.preferences.find(
      (p) => p.preferenceId === preferenceId,
    );

    if (existing) {
      // Remove from preferences
      await removeUserPreferenceByPreferenceIdRepo(db, {
        userId,
        preferenceId,
      });
      return { action: "removed" as const };
    }

    // Add to preferences
    const genresString = genres?.join(", ");
    await addUserPreference(db, {
      userId,
      preferenceId,
      title,
      year,
      category,
      genres: genresString,
      posterPath,
    });
    return { action: "added" as const };
  });

// Shape of a user's full preference/dislike/people profile. The canonical
// source of truth is the server (DB) — never trust a client-supplied copy.
// Exported so the streaming route and other server callers share one type.
// Type-only — safe for the client to import without pulling server runtime.
export type UserContent = {
  movies: Array<{ id: number; title: string; year: number }>;
  tvs: Array<{ id: number; title: string; year: number }>;
  dislikedMovies: Array<{ id: number; title: string; year: number }>;
  dislikedTvs: Array<{ id: number; title: string; year: number }>;
  actors: string[];
  directors: string[];
  genres: string[];
};

export const getAllUserContent = createServerFn().handler(async () => {
  // Get the current session to retrieve authenticated user ID
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  });

  // If no session, return empty preferences
  if (!session?.user?.id) {
    return null;
  }

  // loadUserContent lives in ./preferences-server so its getDb()/postgres
  // import is never reachable from the client bundle. This createServerFn
  // handler is stripped on the client, so its static import of that module
  // is tree-shaken away there.
  const { loadUserContent } = await import("./preferences-server");
  return loadUserContent(session.user.id);
});

// ─── Watchlist ───────────────────────────────────────────────────────────────
// Orthogonal to likes/dislikes (see CONTEXT.md → Watchlist). These fns only
// ever touch user_watchlist; toggling a bookmark must not change taste state.

// Get the current user's watchlist ids — primes the optimistic fill on the
// client (parallel to getUserLikedItems).
export const getUserWatchlistItems = createServerFn({
  method: "GET",
}).handler(async (): Promise<{ watchlistIds: number[] }> => {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  });
  if (!session?.user?.id) {
    return { watchlistIds: [] };
  }

  const db = getDb();
  const result = await getUserWatchlist(db, {
    userId: session.user.id,
  });
  return { watchlistIds: result.watchlist.map((w) => w.watchListId) };
});

// Fetch one page of the full watchlist rows (used by the /watchlist grid).
// Returns the slice plus the totals the <Pagination> component needs,
// mirroring the shape TMDB returns for /movies and /tvs.
export const fetchUserWatchlist = createServerFn({
  method: "GET",
})
  .validator(z.number().int().min(1))
  .handler(async ({ data }) => {
    const page = data;
    const session = await auth.api.getSession({
      headers: getRequest().headers,
    });
    if (!session?.user?.id) {
      return { watchlist: [], page, totalPages: 0, totalItems: 0 };
    }

    const db = getDb();
    const [result, totalItems] = await Promise.all([
      getUserWatchlist(db, {
        userId: session.user.id,
        limit: WATCHLIST_PAGE_SIZE,
        offset: (page - 1) * WATCHLIST_PAGE_SIZE,
      }),
      countUserWatchlist(db, { userId: session.user.id }),
    ]);

    const totalPages =
      totalItems === 0 ? 0 : Math.ceil(totalItems / WATCHLIST_PAGE_SIZE);

    return {
      watchlist: result.watchlist,
      page,
      totalPages,
      totalItems,
    };
  });

// Toggle a watchlist entry (add if absent, remove if present). Parallel to
// toggleMoviePreference but for the watchlist table.
export const toggleWatchlistItem = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      watchListId: z.number(),
      title: z.string(),
      year: z.number(),
      category: z.enum(["movie", "tv-series"]),
      genres: z.array(z.string()).optional(),
      posterPath: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const db = getDb();
    const { watchListId, title, year, category, genres, posterPath } = data;

    // Check if already watchlisted
    const existingResult = await getUserWatchlist(db, {
      userId,
    });

    const existing = existingResult.watchlist.find(
      (w) => w.watchListId === watchListId,
    );

    if (existing) {
      await removeUserWatchlistByWatchListId(db, {
        userId,
        watchListId,
      });
      return { action: "removed" as const };
    }

    const genresString = genres?.join(", ");
    await addUserWatchlist(db, {
      userId,
      watchListId,
      title,
      year,
      category,
      genres: genresString,
      posterPath,
    });
    return { action: "added" as const };
  });
