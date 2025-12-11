import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { FilmInfo, Person } from "@/lib/types";

// Extended Person type that includes dbId from database
type PersonWithDbId = Person & {
  dbId?: number;
};
import {
  addMoviePreference,
  addPersonPreference,
  removeMoviePreference,
  removePersonPreference,
  fetchUserPreferences,
} from "@/lib/data/preferences";

// Types for user preferences
export interface UserPreferences {
  id?: string;
  userId?: string;
  movies: FilmInfo[];
  tvShows: FilmInfo[];
  people: PersonWithDbId[];
  favoriteGenres: string[];
  minRating: number;
  preferredContent: {
    movie: boolean;
    tv: boolean;
  };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Server function to load preferences from database
export const loadPreferences = createServerFn({
  method: "GET",
}).handler(async () => {
  const result = await fetchUserPreferences();
  if (!result.success) {
    throw new Error(result.error || "Failed to load preferences");
  }
  return result.data;
});

// Hook for managing preferences
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        setIsLoading(true);
        const savedPrefs = await loadPreferences();
        setPreferences(savedPrefs);
      } catch (err) {
        setError("Failed to load preferences");
        console.error("Error loading preferences:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrefs();
  }, []);

  // Add a movie/TV show to preferences
  const addPreference = async (content: FilmInfo | Person) => {
    try {
      if ("knownFor" in content) {
        // It's a person/actor
        const person = content as Person;

        const personType = person.category;
        const result = await addPersonPreference({
          data: {
            personId: person.id,
            personName: person.name,
            personType,
            profilePath: person.profileImageUrl,
          },
        });

        if (!result.success) {
          setError(result.error || "Failed to add person preference");
          return;
        }

        // Update local state
        setPreferences((prev) => ({
          ...prev,
          people: [...prev.people, person],
        }));
      } else {
        // It's a movie or TV show
        const film = content as FilmInfo;

        const category = film.category === "tv" ? "tv-series" : "movie";
        const genres = film.genres.join(", ");

        const result = await addMoviePreference({
          data: {
            preferenceId: film.id,
            title: film.title,
            year: parseInt(film.releaseDate.split('-')[0]) || 0,
            category,
            genres: genres || undefined,
            posterPath: film.posterPath,
          },
        });

        if (!result.success) {
          setError(result.error || "Failed to add film preference");
          return;
        }

        // Update local state
        if (film.category === "movie") {
          setPreferences((prev) => ({
            ...prev,
            movies: [...prev.movies, film],
          }));
        } else {
          // TV show
          setPreferences((prev) => ({
            ...prev,
            tvShows: [...prev.tvShows, film],
          }));
        }
      }
    } catch (err) {
      setError("Failed to add preference");
      console.error("Error adding preference:", err);
    }
  };

  // Remove a preference
  const removePreference = async (
    id: number,
    type: "movie" | "tv" | "person"
  ) => {
    try {
      let result;

      if (type === "person") {
        // Find the person and get database ID
        const person = preferences.people.find((p) => p.id === id);
        const dbId = person?.dbId;
        const personType = person?.category || "actor";

        result = await removePersonPreference({
          data: {
            id: dbId || id, // Use dbId if available, fallback to id
            personType,
          },
        });

        if (result.success) {
          setPreferences((prev) => ({
            ...prev,
            people: prev.people.filter((p) => p.id !== id),
          }));
        }
      } else if (type === "movie") {
        // Find the movie and get database ID
        const movie = preferences.movies.find((m) => m.id === id);
        const dbId = (movie as any)?.dbId;

        result = await removeMoviePreference({
          data: {
            id: dbId || id, // Use dbId if available, fallback to id
            type: "movie",
          },
        });

        if (result.success) {
          setPreferences((prev) => ({
            ...prev,
            movies: prev.movies.filter((m) => m.id !== id),
          }));
        }
      } else {
        // TV show
        const tvShow = preferences.tvShows.find((t) => t.id === id);
        const dbId = (tvShow as any)?.dbId;

        result = await removeMoviePreference({
          data: {
            id: dbId || id, // Use dbId if available, fallback to id
            type: "tv-series",
          },
        });

        if (result.success) {
          setPreferences((prev) => ({
            ...prev,
            tvShows: prev.tvShows.filter((t) => t.id !== id),
          }));
        }
      }

      if (!result?.success) {
        setError(result?.error || "Failed to remove preference");
        return;
      }
    } catch (err) {
      setError("Failed to remove preference");
      console.error("Error removing preference:", err);
    }
  };

  // Update general preferences (non-critical data like favorite genres, ratings, etc.)
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      setIsSaving(true);
      const newPreferences = {
        ...preferences,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // For now, we'll just update local state since we don't have a dedicated table
      // for general preferences like favorite genres, minRating, etc.
      // These could be stored in a separate user_settings table in the future
      setPreferences(newPreferences);
    } catch (err) {
      setError("Failed to update preferences");
      console.error("Error updating preferences:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all preferences
  const clearPreferences = async () => {
    try {
      // For now, we'll just clear local state
      // In a future version, we could add server functions to clear all database records
      const newPreferences: UserPreferences = {
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

      setPreferences(newPreferences);
    } catch (err) {
      setError("Failed to clear preferences");
      console.error("Error clearing preferences:", err);
    }
  };

  // Get preference statistics
  const getStats = () => ({
    totalMovies: preferences.movies.length,
    totalTVShows: preferences.tvShows.length,
    totalPeople: preferences.people.length,
    totalFavorites:
      preferences.movies.length +
      preferences.tvShows.length +
      preferences.people.length,
    genreCount: preferences.favoriteGenres.length,
  });

  // Check if an item is already in preferences
  const isInPreferences = (id: number, type: "movie" | "tv" | "person") => {
    if (type === "person") {
      return preferences.people.some((a) => a.id === id);
    } else if (type === "movie") {
      return preferences.movies.some((m) => m.id === id);
    } else {
      return preferences.tvShows.some((t) => t.id === id);
    }
  };

  // Get recommendations based on preferences
  const getRecommendations = () => {
    // This would typically call a recommendation engine
    // For now, return empty array
    return {
      movies: [],
      tvShows: [],
      people: [],
    };
  };

  return {
    preferences,
    isLoading,
    isSaving,
    error,
    addPreference,
    removePreference,
    updatePreferences,
    clearPreferences,
    getStats,
    isInPreferences,
    getRecommendations,
  };
}
