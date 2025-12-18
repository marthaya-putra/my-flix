import { UserPreferences } from "@/lib/types/preferences";

// Type for the structure returned by getAllUserContent
interface AllUserContent {
  movies: Array<{ title: string; year: number }>;
  tvs: Array<{ title: string; year: number }>;
  dislikedMovies: Array<{ title: string; year: number }>;
  dislikedTvs: Array<{ title: string; year: number }>;
  actors: string[];
  directors: string[];
  genres: string[];
}

// Union type for both preference structures
type AnyUserPreferences = UserPreferences | AllUserContent;

// Helper function to check if the object has tvShows property (UserPreferences)
function isUnifiedPreferences(pref: any): pref is UserPreferences {
  return 'tvShows' in pref;
}

export function hasSufficientPreferences(
  preferences: AnyUserPreferences
): boolean {
  if (isUnifiedPreferences(preferences)) {
    // Unified UserPreferences structure
    return preferences.movies.length > 0 || preferences.tvShows.length > 0;
  } else {
    // AllUserContent structure
    return preferences.movies.length > 0 || preferences.tvs.length > 0;
  }
}

export function isNewUser(preferences: AnyUserPreferences): boolean {
  return !hasSufficientPreferences(preferences);
}

export function getPreferenceCounts(preferences: AnyUserPreferences) {
  if (isUnifiedPreferences(preferences)) {
    // Unified UserPreferences structure
    return {
      movies: preferences.movies.length,
      tvShows: preferences.tvShows.length,
      people: preferences.people.length,
      total:
        preferences.movies.length +
        preferences.tvShows.length +
        preferences.people.length,
    };
  } else {
    // AllUserContent structure
    return {
      movies: preferences.movies.length,
      tvShows: preferences.tvs.length,
      people: preferences.actors.length + preferences.directors.length,
      total:
        preferences.movies.length +
        preferences.tvs.length +
        preferences.actors.length +
        preferences.directors.length,
    };
  }
}
