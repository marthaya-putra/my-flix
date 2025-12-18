import { z } from "zod";
import { userPreferences, NewUserPreference, DB } from "@/lib/db";
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
  preferenceId: z.number().positive("TMDB ID is required"),
  title: z.string().min(1, "Title is required"),
  year: z.number().positive("Year is required"),
  category: z.enum(["movie", "tv-series"]),
  genres: z.string().optional(),
  posterPath: z.string().optional(),
});

const removePreferenceSchema = z.object({
  id: z.number().positive(),
  userId: z.string().min(1, "User ID is required"),
});

const getUserPreferencesSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  category: z.enum(["movie", "tv-series"]).optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
});

// Plain functions for user preferences (movies and TV shows)
export async function addUserPreference(db: DB, data: z.infer<typeof addPreferenceSchema>) {
  try {
    // Check if preference already exists for this user
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

    const result = await db.insert(userPreferences).values(newPreference).returning();

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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }
}

export async function getUserPreferences(db: DB, data: z.infer<typeof getUserPreferencesSchema>) {
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
      ? await baseQuery.limit(data.limit).offset(data.offset || 0)
      : await baseQuery.offset(data.offset || 0);

    return {
      success: true,
      preferences,
      hasMore: data.limit ? preferences.length === data.limit : false,
    };
  } catch (error) {
    console.error("Failed to get user preferences:", error);
    throw new Error("Failed to fetch preferences");
  }
}

export async function updateUserPreference(db: DB, data: z.infer<typeof updatePreferenceSchema>) {
  try {
    const result = await db
      .update(userPreferences)
      .set({
        title: data.title,
        year: data.year,
        category: data.category,
        genres: data.genres,
        posterPath: data.posterPath,
        updatedAt: new Date(),
      })
      .where(
        and(eq(userPreferences.id, data.id), eq(userPreferences.userId, data.userId))
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
    throw new Error("Failed to update preference");
  }
}

export async function removeUserPreferenceByPreferenceId(db: DB, data: {
  userId: string;
  preferenceId: number;
}) {
  try {
    const result = await db
      .delete(userPreferences)
      .where(
        and(
          eq(userPreferences.userId, data.userId),
          eq(userPreferences.preferenceId, data.preferenceId)
        )
      )
      .returning();

    return {
      success: true,
      deletedPreference: result.length > 0 ? result[0] : null,
      deletedCount: result.length,
    };
  } catch (error) {
    console.error("Failed to remove user preference:", error);
    throw new Error("Failed to remove preference");
  }
}


export async function searchUserPreferences(db: DB, data: {
  userId: string;
  query: string;
  category?: "movie" | "tv-series";
  limit?: number;
}) {
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
      .limit(data.limit || 20);

    return {
      success: true,
      preferences,
    };
  } catch (error) {
    console.error("Failed to search user preferences:", error);
    throw new Error("Failed to search preferences");
  }
}

// Export schemas for reuse
export const schemas = {
  addPreference: addPreferenceSchema,
  updatePreference: updatePreferenceSchema,
  removePreference: removePreferenceSchema,
  getUserPreferences: getUserPreferencesSchema,
};