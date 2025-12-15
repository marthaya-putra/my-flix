interface UserPreferences {
  movies: any[];
  tvs: any[];
  dislikedContent: any[];
  actors: string[];
  directors: string[];
  genres: string[];
}

export function hasSufficientPreferences(
  preferences: UserPreferences
): boolean {
  return preferences.movies.length > 0 || preferences.tvs.length > 0;
}

export function isNewUser(preferences: UserPreferences): boolean {
  return !hasSufficientPreferences(preferences);
}

export function getPreferenceCounts(preferences: UserPreferences) {
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
