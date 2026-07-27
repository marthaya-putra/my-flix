import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FilmInfo, Person } from "@/lib/types";
import { UserPreferences } from "@/lib/types/preferences";
import {
  addMoviePreference,
  addPersonPreference,
  removeMoviePreference,
  removePersonPreference,
  fetchUserPreferences,
} from "@/lib/data/preferences";
import { preferencesKeys } from "@/lib/queries/preferences";

// Re-export fetchUserPreferences as loadPreferences for consistency
export const loadPreferences = fetchUserPreferences;

// Hook for managing preferences
export function usePreferences(initialPreferences?: UserPreferences) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<UserPreferences>(
    initialPreferences || {
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
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingItems, setAddingItems] = useState<Set<number>>(new Set());

  // After any preference mutation, invalidate the cached user-preferences
  // and liked-items queries so read paths (navbar, listings) refetch the
  // canonical server state.
  const invalidatePreferenceQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: preferencesKeys.userPreferences(),
    });
    void queryClient.invalidateQueries({
      queryKey: preferencesKeys.likedItems(),
    });
  };

  // Add a movie/TV show to preferences. Server fns throw on failure (Issue
  // #78); this hook recovers locally by surfacing the error in `error`
  // state, so it wraps the call in try/catch.
  const addPreference = async (content: FilmInfo | Person) => {
    try {
      // Add item to adding set
      setAddingItems((prev) => new Set(prev).add(content.id));

      if ("knownFor" in content) {
        // It's a person/actor
        const person = content as Person;

        const personType = person.category;
        await addPersonPreference({
          data: {
            personId: person.id,
            personName: person.name,
            personType,
            profilePath: person.profileImageUrl,
          },
        });

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

        await addMoviePreference({
          data: {
            preferenceId: film.id,
            title: film.title,
            year: parseInt(film.releaseDate.split('-')[0]) || 0,
            category,
            genres: genres || undefined,
            posterPath: film.posterPath,
          },
        });

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
      setError(
        err instanceof Error ? err.message : "Failed to add preference"
      );
      console.error("Error adding preference:", err);
    } finally {
      // Remove item from adding set
      setAddingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(content.id);
        return newSet;
      });
      // Local state already updated above; keep the query cache in sync
      // so other surfaces (navbar, liked-items) reflect the change.
      invalidatePreferenceQueries();
    }
  };

  // Remove a preference. Server fns throw on failure (Issue #78); this hook
  // recovers locally via `error` state.
  const removePreference = async (
    id: number,
    type: "movie" | "tv" | "person"
  ) => {
    try {
      if (type === "person") {
        // Find the person and get database ID
        const person = preferences.people.find((p) => p.id === id);
        const dbId = person?.dbId;
        const personType = person?.category || "actor";

        await removePersonPreference({
          data: {
            id: dbId || id, // Use dbId if available, fallback to id
            personType,
          },
        });

        setPreferences((prev) => ({
          ...prev,
          people: prev.people.filter((p) => p.id !== id),
        }));
      } else if (type === "movie") {
        // Find the movie and get database ID
        const movie = preferences.movies.find((m) => m.id === id);
        const dbId = (movie as any)?.dbId;

        await removeMoviePreference({
          data: {
            id: dbId || id, // Use dbId if available, fallback to id
            type: "movie",
          },
        });

        setPreferences((prev) => ({
          ...prev,
          movies: prev.movies.filter((m) => m.id !== id),
        }));
      } else {
        // TV show
        const tvShow = preferences.tvShows.find((t) => t.id === id);
        const dbId = (tvShow as any)?.dbId;

        await removeMoviePreference({
          data: {
            id: dbId || id, // Use dbId if available, fallback to id
            type: "tv-series",
          },
        });

        setPreferences((prev) => ({
          ...prev,
          tvShows: prev.tvShows.filter((t) => t.id !== id),
        }));
      }

      // Local state already updated above; keep the query cache in sync.
      invalidatePreferenceQueries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove preference"
      );
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

  // Check if an item is currently being added
  const isAdding = (id: number) => addingItems.has(id);

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
    isSaving,
    error,
    addingItems,
    addPreference,
    removePreference,
    updatePreferences,
    clearPreferences,
    getStats,
    isInPreferences,
    isAdding,
    getRecommendations,
  };
}
