import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db, userPreferences, userPeople } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { FilmInfo, Person } from '@/lib/types';

// Input validation schemas
const AddMoviePreferenceInput = z.object({
  title: z.string(),
  category: z.enum(['movie', 'tv-series']),
  genres: z.string().optional(),
  posterPath: z.string().optional(),
});

const AddPersonPreferenceInput = z.object({
  personName: z.string(),
  personType: z.enum(['actor', 'director']),
  profilePath: z.string().optional(),
});

const RemovePreferenceInput = z.object({
  id: z.number(),
  type: z.enum(['movie', 'tv-series']),
});

const RemovePersonInput = z.object({
  id: z.number(),
  personType: z.enum(['actor', 'director']),
});

// Hardcoded user ID for now
const DEFAULT_USER_ID = 'default-user';

// Add movie/TV show to user preferences
export const addMoviePreference = createServerFn({
  method: 'POST',
})
  .inputValidator(AddMoviePreferenceInput)
  .handler(async ({ data }) => {
    try {
      const { title, category, genres, posterPath } = data;

      // Check if already exists
      const existing = await db.select()
        .from(userPreferences)
        .where(and(
          eq(userPreferences.userId, DEFAULT_USER_ID),
          eq(userPreferences.title, title),
          eq(userPreferences.category, category)
        ))
        .limit(1);

      if (existing.length > 0) {
        return { success: false, error: 'Already in preferences' };
      }

      // Insert new preference
      const result = await db.insert(userPreferences)
        .values({
          userId: DEFAULT_USER_ID,
          title,
          category,
          genres: genres || null,
          posterPath: posterPath || null,
        })
        .returning();

      return { success: true, data: result[0] };
    } catch (error) {
      console.error('Error adding movie preference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add movie preference'
      };
    }
  });

// Remove movie/TV show from user preferences
export const removeMoviePreference = createServerFn({
  method: 'POST',
})
  .inputValidator(RemovePreferenceInput)
  .handler(async ({ data }) => {
    try {
      const { id, type } = data;

      const result = await db.delete(userPreferences)
        .where(and(
          eq(userPreferences.id, id),
          eq(userPreferences.userId, DEFAULT_USER_ID),
          eq(userPreferences.category, type)
        ))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Preference not found' };
      }

      return { success: true, data: result[0] };
    } catch (error) {
      console.error('Error removing movie preference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove movie preference'
      };
    }
  });

// Add person (actor/director) to user people
export const addPersonPreference = createServerFn({
  method: 'POST',
})
  .inputValidator(AddPersonPreferenceInput)
  .handler(async ({ data }) => {
    try {
      const { personName, personType, profilePath } = data;

      // Check if already exists
      const existing = await db.select()
        .from(userPeople)
        .where(and(
          eq(userPeople.userId, DEFAULT_USER_ID),
          eq(userPeople.personName, personName),
          eq(userPeople.personType, personType)
        ))
        .limit(1);

      if (existing.length > 0) {
        return { success: false, error: 'Already in preferences' };
      }

      // Insert new person
      const result = await db.insert(userPeople)
        .values({
          userId: DEFAULT_USER_ID,
          personName,
          personType,
          profilePath: profilePath || null,
        })
        .returning();

      return { success: true, data: result[0] };
    } catch (error) {
      console.error('Error adding person preference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add person preference'
      };
    }
  });

// Remove person (actor/director) from user people
export const removePersonPreference = createServerFn({
  method: 'POST',
})
  .inputValidator(RemovePersonInput)
  .handler(async ({ data }) => {
    try {
      const { id, personType } = data;

      const result = await db.delete(userPeople)
        .where(and(
          eq(userPeople.id, id),
          eq(userPeople.userId, DEFAULT_USER_ID),
          eq(userPeople.personType, personType)
        ))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Person not found' };
      }

      return { success: true, data: result[0] };
    } catch (error) {
      console.error('Error removing person preference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove person preference'
      };
    }
  });

// Fetch all user preferences for the preferences page
export const fetchUserPreferences = createServerFn({
  method: 'GET',
})
  .handler(async () => {
    try {
      console.log('Fetching user preferences from database...');
      // Fetch movie and TV preferences
      const movieTVPreferences = await db.select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, DEFAULT_USER_ID))
        .orderBy(userPreferences.createdAt);

      // Fetch people preferences
      const peoplePreferences = await db.select()
        .from(userPeople)
        .where(eq(userPeople.userId, DEFAULT_USER_ID))
        .orderBy(userPeople.createdAt);

      console.log('Fetched movieTVPreferences:', movieTVPreferences);
      console.log('Fetched peoplePreferences:', peoplePreferences);

      // Separate movies and TV shows
      const movies = movieTVPreferences
        .filter(pref => pref.category === 'movie')
        .map(pref => ({
          id: pref.id,
          title: pref.title,
          category: 'movie' as const,
          genreIds: [],
          genres: pref.genres ? pref.genres.split(',').map(g => g.trim()).filter(Boolean) : [],
          posterPath: pref.posterPath || '',
          backdropPath: '',
          overview: '',
          voteAverage: 0,
          releaseDate: pref.createdAt?.toISOString() || '',
        }));

      const tvShows = movieTVPreferences
        .filter(pref => pref.category === 'tv-series')
        .map(pref => ({
          id: pref.id,
          title: pref.title,
          category: 'tv' as const,
          genreIds: [],
          genres: pref.genres ? pref.genres.split(',').map(g => g.trim()).filter(Boolean) : [],
          posterPath: pref.posterPath || '',
          backdropPath: '',
          overview: '',
          voteAverage: 0,
          releaseDate: pref.createdAt?.toISOString() || '',
        }));

      // Convert people preferences
      const people = peoplePreferences
        .map(pref => ({
          id: pref.id,
          name: pref.personName,
          profileImageUrl: pref.profilePath || '',
          popularity: 0,
          knownFor: [],
          category: pref.personType as "actor" | "director" | "other",
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
          notes: '',
        },
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user preferences',
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
          notes: '',
        },
      };
    }
  });

// Helper function to add content from FilmInfo
export const addFilmInfoPreference = createServerFn({
  method: 'POST',
})
  .inputValidator(z.object({
    filmInfo: z.object({
      id: z.number(),
      title: z.string(),
      category: z.enum(['movie', 'tv']),
      genres: z.array(z.string()),
    }),
  }))
  .handler(async ({ data }) => {
    try {
      const { filmInfo } = data;
      const category = filmInfo.category === 'tv' ? 'tv-series' : 'movie';
      const genres = filmInfo.genres.join(', ');

      return await addMoviePreference({
        data: {
          title: filmInfo.title,
          category,
          genres: genres || undefined,
        }
      });
    } catch (error) {
      console.error('Error adding film info preference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add film info preference'
      };
    }
  });

// Helper function to add content from Person
export const addPersonInfoPreference = createServerFn({
  method: 'POST',
})
  .inputValidator(z.object({
    person: z.object({
      id: z.number(),
      name: z.string(),
      knownForDepartment: z.string().optional(),
    }),
    personType: z.enum(['actor', 'director']),
  }))
  .handler(async ({ data }) => {
    try {
      const { person, personType } = data;

      return await addPersonPreference({
        data: {
          personName: person.name,
          personType,
        }
      });
    } catch (error) {
      console.error('Error adding person info preference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add person info preference'
      };
    }
  });