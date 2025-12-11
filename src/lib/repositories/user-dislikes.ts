import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  db,
  userDislikes,
  UserDislike,
  NewUserDislike,
} from "@/lib/db";
import { eq, and, desc, ilike } from "drizzle-orm";

// Input validation schemas
const addDislikeSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  preferenceId: z.number().positive("TMDB ID is required"),
  title: z.string().min(1, "Title is required"),
  year: z.number().positive("Year is required"),
  category: z.enum(["movie", "tv-series"], {
    message: "Category must be either movie or tv-series",
  }),
});

const removeDislikeByTmdbIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  preferenceId: z.number().positive("TMDB ID is required"),
});

const getUserDislikesSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  category: z.enum(["movie", "tv-series"]).optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
});

const searchUserDislikesSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  query: z.string().min(1, "Search query is required"),
  category: z.enum(["movie", "tv-series"]).optional(),
  limit: z.number().positive().default(20),
});

// Server functions for user dislikes
export const addUserDislike = createServerFn({
  method: "POST",
})
  .inputValidator(addDislikeSchema)
  .handler(async ({ data }) => {
    try {
      // Check if dislike already exists
      const existing = await db
        .select()
        .from(userDislikes)
        .where(
          and(
            eq(userDislikes.userId, data.userId),
            eq(userDislikes.preferenceId, data.preferenceId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Dislike already exists, return success with the existing dislike
        return {
          success: true,
          dislike: existing[0],
        };
      }

      // Insert new dislike
      const newDislike: NewUserDislike = {
        userId: data.userId,
        preferenceId: data.preferenceId,
        title: data.title,
        year: data.year,
        category: data.category,
      };

      const result = await db
        .insert(userDislikes)
        .values(newDislike)
        .returning();

      return {
        success: true,
        dislike: result[0],
      };
    } catch (error) {
      console.error("Failed to add user dislike:", error);
      // Always return success even on failure as this is not fatal
      return {
        success: true,
        dislike: {
          userId: data.userId,
          preferenceId: data.preferenceId,
          title: data.title,
          year: data.year,
          category: data.category,
        },
      };
    }
  });

export const getUserDislikes = createServerFn({
  method: "GET",
})
  .inputValidator(getUserDislikesSchema)
  .handler(async ({ data }) => {
    try {
      const whereConditions = [eq(userDislikes.userId, data.userId)];

      if (data.category) {
        whereConditions.push(eq(userDislikes.category, data.category));
      }

      const baseQuery = db
        .select()
        .from(userDislikes)
        .where(and(...whereConditions))
        .orderBy(desc(userDislikes.updatedAt));

      const dislikes = data.limit
        ? await baseQuery.limit(data.limit).offset(data.offset || 0)
        : await baseQuery.offset(data.offset || 0);

      return {
        success: true,
        dislikes,
        hasMore: data.limit ? dislikes.length === data.limit : false,
      };
    } catch (error) {
      console.error("Failed to get user dislikes:", error);
      throw new Error("Failed to fetch dislikes");
    }
  });

export const searchUserDislikes = createServerFn({
  method: "GET",
})
  .inputValidator(searchUserDislikesSchema)
  .handler(async ({ data }) => {
    try {
      const whereConditions = [
        eq(userDislikes.userId, data.userId),
        ilike(userDislikes.title, `%${data.query}%`),
      ];

      if (data.category) {
        whereConditions.push(eq(userDislikes.category, data.category));
      }

      const dislikes = await db
        .select()
        .from(userDislikes)
        .where(and(...whereConditions))
        .orderBy(desc(userDislikes.updatedAt))
        .limit(data.limit);

      return {
        success: true,
        dislikes,
      };
    } catch (error) {
      console.error("Failed to search user dislikes:", error);
      throw new Error("Failed to search dislikes");
    }
  });

export const removeUserDislikeByPreferenceId = createServerFn({
  method: "POST",
})
  .inputValidator(removeDislikeByTmdbIdSchema)
  .handler(async ({ data }) => {
    try {
      // First, retrieve the dislike to delete
      const dislikesToDelete = await db
        .select()
        .from(userDislikes)
        .where(
          and(
            eq(userDislikes.userId, data.userId),
            eq(userDislikes.preferenceId, data.preferenceId)
          )
        )
        .limit(1);

      if (dislikesToDelete.length === 0) {
        // Dislike not found, return success with the input data
        return {
          success: true,
          deletedDislike: {
            userId: data.userId,
            preferenceId: data.preferenceId,
          },
        };
      }

      // Proceed with deletion
      const result = await db
        .delete(userDislikes)
        .where(
          and(
            eq(userDislikes.userId, data.userId),
            eq(userDislikes.preferenceId, data.preferenceId)
          )
        )
        .returning();

      // If deletion result is empty, return the previously retrieved item
      const deletedDislike = result.length > 0 ? result[0] : dislikesToDelete[0];

      return {
        success: true,
        deletedDislike,
      };
    } catch (error) {
      console.error("Failed to remove user dislike:", error);
      // Always return success even on failure as this is not fatal
      return {
        success: true,
        deletedDislike: {
          userId: data.userId,
          preferenceId: data.preferenceId,
        },
      };
    }
  });

// Export schemas for reuse
export const schemas = {
  addDislike: addDislikeSchema,
  removeDislikeByTmdbId: removeDislikeByTmdbIdSchema,
  getUserDislikes: getUserDislikesSchema,
  searchUserDislikes: searchUserDislikesSchema,
};