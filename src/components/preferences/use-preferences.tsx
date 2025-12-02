import { useState, useEffect } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { FilmInfo, Person } from '@/lib/types';

// Types for user preferences
export interface UserPreferences {
  id?: string;
  userId?: string;
  movies: FilmInfo[];
  tvShows: FilmInfo[];
  actors: Person[];
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

// Server function to save preferences
export const savePreferences = createServerFn({
  method: 'POST',
})
  .inputValidator((data: UserPreferences) => data)
  .handler(async ({ data }) => {
    // In a real app, you would save this to a database
    // For now, we'll just simulate saving
    console.log('Saving preferences:', data);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      preferences: {
        ...data,
        id: 'user-prefs-1',
        updatedAt: new Date().toISOString(),
      }
    };
  });

// Server function to load preferences
export const loadPreferences = createServerFn({
  method: 'GET',
})
  .handler(async () => {
    // In a real app, you would fetch this from a database
    // For now, we'll return mock data
    const mockPreferences: UserPreferences = {
      id: 'user-prefs-1',
      movies: [],
      tvShows: [],
      actors: [],
      favoriteGenres: ['Comedy', 'Drama', 'Action'],
      minRating: 6.5,
      preferredContent: {
        movie: true,
        tv: true,
      },
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return mockPreferences;
  });

// Hook for managing preferences
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    movies: [],
    tvShows: [],
    actors: [],
    favoriteGenres: [],
    minRating: 6,
    preferredContent: {
      movie: true,
      tv: true,
    },
    notes: '',
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
        setError('Failed to load preferences');
        console.error('Error loading preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrefs();
  }, []);

  // Add a movie/TV show to preferences
  const addPreference = async (content: FilmInfo | Person) => {
    try {
      let newPreferences: UserPreferences;

      if (content.knownFor !== undefined) {
        // It's a person/actor
        const existingIndex = preferences.actors.findIndex(a => a.id === content.id);
        if (existingIndex >= 0) {
          // Already exists, don't add duplicate
          return;
        }
        newPreferences = {
          ...preferences,
          actors: [...preferences.actors, content as Person],
        };
      } else {
        // It's a movie or TV show
        const film = content as FilmInfo;
        if (film.category === 'movie') {
          const existingIndex = preferences.movies.findIndex(m => m.id === content.id);
          if (existingIndex >= 0) {
            // Already exists, don't add duplicate
            return;
          }
          newPreferences = {
            ...preferences,
            movies: [...preferences.movies, film],
          };
        } else {
          // TV show
          const existingIndex = preferences.tvShows.findIndex(t => t.id === content.id);
          if (existingIndex >= 0) {
            // Already exists, don't add duplicate
            return;
          }
          newPreferences = {
            ...preferences,
            tvShows: [...preferences.tvShows, film],
          };
        }
      }

      await savePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError('Failed to add preference');
      console.error('Error adding preference:', err);
    }
  };

  // Remove a preference
  const removePreference = async (id: number, type: 'movie' | 'tv' | 'person') => {
    try {
      let newPreferences: UserPreferences;

      if (type === 'person') {
        newPreferences = {
          ...preferences,
          actors: preferences.actors.filter(a => a.id !== id),
        };
      } else if (type === 'movie') {
        newPreferences = {
          ...preferences,
          movies: preferences.movies.filter(m => m.id !== id),
        };
      } else {
        // TV show
        newPreferences = {
          ...preferences,
          tvShows: preferences.tvShows.filter(t => t.id !== id),
        };
      }

      await savePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError('Failed to remove preference');
      console.error('Error removing preference:', err);
    }
  };

  // Update general preferences
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      setIsSaving(true);
      const newPreferences = {
        ...preferences,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await savePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError('Failed to update preferences');
      console.error('Error updating preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all preferences
  const clearPreferences = async () => {
    try {
      const newPreferences: UserPreferences = {
        movies: [],
        tvShows: [],
        actors: [],
        favoriteGenres: [],
        minRating: 6,
        preferredContent: {
          movie: true,
          tv: true,
        },
        notes: '',
      };

      await savePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError('Failed to clear preferences');
      console.error('Error clearing preferences:', err);
    }
  };

  // Get preference statistics
  const getStats = () => ({
    totalMovies: preferences.movies.length,
    totalTVShows: preferences.tvShows.length,
    totalActors: preferences.actors.length,
    totalFavorites: preferences.movies.length + preferences.tvShows.length + preferences.actors.length,
    genreCount: preferences.favoriteGenres.length,
  });

  // Check if an item is already in preferences
  const isInPreferences = (id: number, type: 'movie' | 'tv' | 'person') => {
    if (type === 'person') {
      return preferences.actors.some(a => a.id === id);
    } else if (type === 'movie') {
      return preferences.movies.some(m => m.id === id);
    } else {
      return preferences.tvShows.some(t => t.id === id);
    }
  };

  // Get recommendations based on preferences
  const getRecommendations = () => {
    // This would typically call a recommendation engine
    // For now, return empty array
    return {
      movies: [],
      tvShows: [],
      actors: [],
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