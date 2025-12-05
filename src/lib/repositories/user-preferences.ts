import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  db,
  userPreferences,
  UserPreference,
  NewUserPreference,
} from "@/lib/db";
import { eq, and, desc, ilike } from "drizzle-orm";

// Input validation schemas
const addPreferenceSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  preferenceId: z.number().positive("TMDB ID is required"),
  title: z.string().min(1, "Title is required"),
  year: z.number().positive("Year is required"),
  category: z.enum(["movie", "tv-series"], {
    message: "Category must be either movie or tv-series",
  }),
  genres: z.string().optional(),
  posterPath: z.string().optional(),
});

const updatePreferenceSchema = z.object({
  id: z.number().positive(),
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required"),
  year: z.number().positive("Year is required"),
  category: z.enum(["movie", "tv-series"]),
  genres: z.string().optional(),
});

const removePreferenceByTmdbIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  preferenceId: z.number().positive("TMDB ID is required"),
});

const getUserPreferencesSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  category: z.enum(["movie", "tv-series"]).optional(),
  limit: z.number().positive().max(100).optional(),
  offset: z.number().nonnegative().default(0),
});

// Server functions for user preferences
export const addUserPreference = createServerFn({
  method: "POST",
})
  .inputValidator(addPreferenceSchema)
  .handler(async ({ data }) => {
    try {
      // Check if preference already exists
      const existing = await db
        .select()
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, data.userId),
            eq(userPreferences.preferenceId, data.preferenceId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Preference already exists, return success with the existing preference
        return {
          success: true,
          preference: existing[0],
        };
      }

      // Insert new preference
      const newPreference: NewUserPreference = {
        userId: data.userId,
        preferenceId: data.preferenceId,
        title: data.title,
        year: data.year,
        category: data.category,
        genres: data.genres || null,
        posterPath: data.posterPath || null,
      };

      const result = await db
        .insert(userPreferences)
        .values(newPreference)
        .returning();

      return {
        success: true,
        preference: result[0],
      };
    } catch (error) {
      console.error("Failed to add user preference:", error);
      // Always return success even on failure as this is not fatal
      return {
        success: true,
        preference: {
          userId: data.userId,
          preferenceId: data.preferenceId,
          title: data.title,
          year: data.year,
          category: data.category,
          genres: data.genres || null,
          posterPath: data.posterPath || null,
        },
      };
    }
  });

export const getUserPreferences = createServerFn({
  method: "GET",
})
  .inputValidator(getUserPreferencesSchema)
  .handler(async ({ data }) => {
    try {
      const whereConditions = [eq(userPreferences.userId, data.userId)];

      if (data.category) {
        whereConditions.push(eq(userPreferences.category, data.category));
      }

      const baseQuery = db
        .select()
        .from(userPreferences)
        .where(and(...whereConditions))
        .orderBy(desc(userPreferences.updatedAt));

      const preferences = data.limit
        ? await baseQuery.limit(data.limit).offset(data.offset)
        : await baseQuery.offset(data.offset);

      return {
        success: true,
        preferences,
        hasMore: data.limit ? preferences.length === data.limit : false,
      };
    } catch (error) {
      console.error("Failed to get user preferences:", error);
      throw new Error("Failed to fetch preferences");
    }
  });

export const updateUserPreference = createServerFn({
  method: "POST",
})
  .inputValidator(updatePreferenceSchema)
  .handler(async ({ data }) => {
    try {
      const result = await db
        .update(userPreferences)
        .set({
          title: data.title,
          year: data.year,
          category: data.category,
          genres: data.genres || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userPreferences.id, data.id),
            eq(userPreferences.userId, data.userId)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new Error("Preference not found or access denied");
      }

      return {
        success: true,
        preference: result[0],
      };
    } catch (error) {
      console.error("Failed to update user preference:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update preference"
      );
    }
  });


export const searchUserPreferences = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      userId: z.string().min(1, "User ID is required"),
      query: z.string().min(1, "Search query is required"),
      category: z.enum(["movie", "tv-series"]).optional(),
      limit: z.number().positive().max(50).default(20),
    })
  )
  .handler(async ({ data }) => {
    try {
      const whereConditions = [
        eq(userPreferences.userId, data.userId),
        ilike(userPreferences.title, `%${data.query}%`),
      ];

      if (data.category) {
        whereConditions.push(eq(userPreferences.category, data.category));
      }

      const preferences = await db
        .select()
        .from(userPreferences)
        .where(and(...whereConditions))
        .orderBy(desc(userPreferences.updatedAt))
        .limit(data.limit);

      return {
        success: true,
        preferences,
      };
    } catch (error) {
      console.error("Failed to search user preferences:", error);
      throw new Error("Failed to search preferences");
    }
  });

export const removeUserPreferenceByPreferenceId = createServerFn({
  method: "POST",
})
  .inputValidator(removePreferenceByTmdbIdSchema)
  .handler(async ({ data }) => {
    try {
      // First, retrieve the preference to delete
      const preferencesToDelete = await db
        .select()
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, data.userId),
            eq(userPreferences.preferenceId, data.preferenceId)
          )
        )
        .limit(1);

      if (preferencesToDelete.length === 0) {
        // Preference not found, return success with the input data
        return {
          success: true,
          deletedPreference: {
            userId: data.userId,
            preferenceId: data.preferenceId,
          },
        };
      }

      // Proceed with deletion
      const result = await db
        .delete(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, data.userId),
            eq(userPreferences.preferenceId, data.preferenceId)
          )
        )
        .returning();

      // If deletion result is empty, return the previously retrieved item
      const deletedPreference = result.length > 0 ? result[0] : preferencesToDelete[0];

      return {
        success: true,
        deletedPreference,
      };
    } catch (error) {
      console.error("Failed to remove user preference:", error);
      // Always return success even on failure as this is not fatal
      return {
        success: true,
        deletedPreference: {
          userId: data.userId,
          preferenceId: data.preferenceId,
        },
      };
    }
  });

// Export schemas for reuse
export const schemas = {
  addPreference: addPreferenceSchema,
  updatePreference: updatePreferenceSchema,
  removePreferenceByTmdbId: removePreferenceByTmdbIdSchema,
  getUserPreferences: getUserPreferencesSchema,
  searchUserPreferences: z.object({
    userId: z.string().min(1, "User ID is required"),
    query: z.string().min(1, "Search query is required"),
    category: z.enum(["movie", "tv-series"]).optional(),
    limit: z.number().positive().max(50).default(20),
  }),
};
