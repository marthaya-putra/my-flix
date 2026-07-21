import { z } from "zod";
import {
  userWatchlist,
  NewUserWatchlist,
  DB,
} from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

// Input validation schemas
const addWatchlistSchema = z.object({
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

const removeWatchlistByPreferenceIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  preferenceId: z.number().positive("TMDB ID is required"),
});

const getUserWatchlistSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  category: z.enum(["movie", "tv-series"]).optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
});

// Plain functions for user watchlist. Mirrors the user-dislikes shape: always
// return success on error (watchlist is not fatal), so the client UI can stay
// optimistic. Watchlist is orthogonal to likes/dislikes — these fns never
// touch user_preferences or user_dislikes.
export async function addUserWatchlist(
  db: DB,
  data: z.infer<typeof addWatchlistSchema>,
) {
  try {
    // Idempotent: if the row already exists, return it without inserting.
    const existing = await db
      .select()
      .from(userWatchlist)
      .where(
        and(
          eq(userWatchlist.userId, data.userId),
          eq(userWatchlist.preferenceId, data.preferenceId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: true,
        watchlist: existing[0],
      };
    }

    const newWatchlist: NewUserWatchlist = {
      userId: data.userId,
      preferenceId: data.preferenceId,
      title: data.title,
      year: data.year,
      category: data.category,
      genres: data.genres || null,
      posterPath: data.posterPath || null,
    };

    const result = await db
      .insert(userWatchlist)
      .values(newWatchlist)
      .returning();

    return {
      success: true,
      watchlist: result[0],
    };
  } catch (error) {
    console.error("Failed to add user watchlist item:", error);
    // Always return success even on failure as this is not fatal
    return {
      success: true,
      watchlist: {
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

export async function getUserWatchlist(
  db: DB,
  data: z.infer<typeof getUserWatchlistSchema>,
) {
  try {
    const whereConditions = [eq(userWatchlist.userId, data.userId)];

    if (data.category) {
      whereConditions.push(eq(userWatchlist.category, data.category));
    }

    const baseQuery = db
      .select()
      .from(userWatchlist)
      .where(and(...whereConditions))
      .orderBy(desc(userWatchlist.updatedAt));

    const watchlist = data.limit
      ? await baseQuery.limit(data.limit).offset(data.offset || 0)
      : await baseQuery.offset(data.offset || 0);

    return {
      success: true,
      watchlist,
      hasMore: data.limit ? watchlist.length === data.limit : false,
    };
  } catch (error) {
    console.error("Failed to get user watchlist:", error);
    throw new Error("Failed to fetch watchlist");
  }
}

export async function removeUserWatchlistByPreferenceId(
  db: DB,
  data: z.infer<typeof removeWatchlistByPreferenceIdSchema>,
) {
  try {
    // First, retrieve the row to delete (for a meaningful return value even
    // if the returning() result is empty on some drivers).
    const rowsToDelete = await db
      .select()
      .from(userWatchlist)
      .where(
        and(
          eq(userWatchlist.userId, data.userId),
          eq(userWatchlist.preferenceId, data.preferenceId),
        ),
      )
      .limit(1);

    if (rowsToDelete.length === 0) {
      // Not found — idempotent success.
      return {
        success: true,
        deletedWatchlist: {
          userId: data.userId,
          preferenceId: data.preferenceId,
        },
      };
    }

    const result = await db
      .delete(userWatchlist)
      .where(
        and(
          eq(userWatchlist.userId, data.userId),
          eq(userWatchlist.preferenceId, data.preferenceId),
        ),
      )
      .returning();

    const deletedWatchlist = result.length > 0 ? result[0] : rowsToDelete[0];

    return {
      success: true,
      deletedWatchlist,
    };
  } catch (error) {
    console.error("Failed to remove user watchlist item:", error);
    // Always return success even on failure as this is not fatal
    return {
      success: true,
      deletedWatchlist: {
        userId: data.userId,
        preferenceId: data.preferenceId,
      },
    };
  }
}

// Export schemas for reuse
export const schemas = {
  addWatchlist: addWatchlistSchema,
  removeWatchlistByPreferenceId: removeWatchlistByPreferenceIdSchema,
  getUserWatchlist: getUserWatchlistSchema,
};
