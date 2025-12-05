import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, userPeople, UserPerson, NewUserPerson } from "@/lib/db";
import { eq, and, desc, ilike } from "drizzle-orm";

// Input validation schemas
const addPersonSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  personId: z.number().positive("TMDB ID is required"),
  personName: z.string().min(1, "Person name is required"),
  personType: z.enum(["actor", "director", "other"]),
  profilePath: z.string().optional(),
});

const updatePersonSchema = z.object({
  id: z.number().positive(),
  userId: z.string().min(1, "User ID is required"),
  personId: z.number().positive("TMDB ID is required"),
  personName: z.string().min(1, "Person name is required"),
  personType: z.enum(["actor", "director", "other"]),
  profilePath: z.string().optional(),
});

const removePersonSchema = z.object({
  id: z.number().positive(),
  userId: z.string().min(1, "User ID is required"),
});

const getUserPeopleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  personType: z.enum(["actor", "director", "other"]).optional(),
  limit: z.number().positive().max(100).optional(),
  offset: z.number().nonnegative().default(0),
});

// Server functions for user people preferences (actors and directors)
export const addUserPerson = createServerFn({
  method: "POST",
})
  .inputValidator(addPersonSchema)
  .handler(async ({ data }) => {
    try {
      // Check if person already exists for this user
      const existing = await db
        .select()
        .from(userPeople)
        .where(
          and(
            eq(userPeople.userId, data.userId),
            eq(userPeople.personId, data.personId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error(
          `This ${data.personType} is already in your preferences`
        );
      }

      // Insert new person preference
      const newPerson: NewUserPerson = {
        userId: data.userId,
        personId: data.personId,
        personName: data.personName,
        personType: data.personType,
        profilePath: data.profilePath || null,
      };

      const result = await db.insert(userPeople).values(newPerson).returning();

      return {
        success: true,
        person: result[0],
      };
    } catch (error) {
      console.error("Failed to add user person:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to add person preference"
      );
    }
  });

// Legacy function for backward compatibility
export const addUserActor = addUserPerson;

export const getUserPeople = createServerFn({
  method: "GET",
})
  .inputValidator(getUserPeopleSchema)
  .handler(async ({ data }) => {
    try {
      let whereConditions = [eq(userPeople.userId, data.userId)];

      if (data.personType) {
        whereConditions.push(eq(userPeople.personType, data.personType));
      }

      let query = db
        .select()
        .from(userPeople)
        .where(and(...whereConditions))
        .orderBy(desc(userPeople.createdAt))
        .$dynamic();

      if (data.limit) {
        query = query.limit(data.limit);
      }

      if (data.offset > 0) {
        query = query.offset(data.offset);
      }

      const people = await query;

      return {
        success: true,
        people,
        hasMore: data.limit ? people.length === data.limit : false,
      };
    } catch (error) {
      console.error("Failed to get user people:", error);
      throw new Error("Failed to fetch person preferences");
    }
  });

// Legacy function for backward compatibility (actors only)
export const getUserActors = createServerFn({
  method: "GET",
})
  .inputValidator(
    getUserPeopleSchema
      .omit({ personType: true })
      .extend({ personType: z.literal("actor").optional() })
  )
  .handler(async ({ data }) => {
    try {
      let query = db
        .select()
        .from(userPeople)
        .where(
          and(
            eq(userPeople.userId, data.userId),
            eq(userPeople.personType, "actor")
          )
        )
        .orderBy(desc(userPeople.createdAt))
        .$dynamic();

      if (data.limit) {
        query = query.limit(data.limit);
      }

      if (data.offset > 0) {
        query = query.offset(data.offset);
      }

      const actors = await query;

      return {
        success: true,
        actors,
        hasMore: data.limit ? actors.length === data.limit : false,
      };
    } catch (error) {
      console.error("Failed to get user actors:", error);
      throw new Error("Failed to fetch actor preferences");
    }
  });

export const updateUserPerson = createServerFn({
  method: "POST",
})
  .inputValidator(updatePersonSchema)
  .handler(async ({ data }) => {
    try {
      const result = await db
        .update(userPeople)
        .set({
          personName: data.personName,
          personType: data.personType,
        })
        .where(
          and(eq(userPeople.id, data.id), eq(userPeople.userId, data.userId))
        )
        .returning();

      if (result.length === 0) {
        throw new Error("Person not found or access denied");
      }

      return {
        success: true,
        person: result[0],
      };
    } catch (error) {
      console.error("Failed to update user person:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update person preference"
      );
    }
  });

// Legacy function for backward compatibility
export const updateUserActor = updateUserPerson;

export const removeUserPerson = createServerFn({
  method: "POST",
})
  .inputValidator(removePersonSchema)
  .handler(async ({ data }) => {
    try {
      const result = await db
        .delete(userPeople)
        .where(
          and(eq(userPeople.id, data.id), eq(userPeople.userId, data.userId))
        )
        .returning();

      if (result.length === 0) {
        throw new Error("Person not found or access denied");
      }

      return {
        success: true,
        deletedPerson: result[0],
      };
    } catch (error) {
      console.error("Failed to remove user person:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to remove person preference"
      );
    }
  });

// Legacy function for backward compatibility
export const removeUserActor = removeUserPerson;

export const searchUserPeople = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      userId: z.string().min(1, "User ID is required"),
      query: z.string().min(1, "Search query is required"),
      personType: z.enum(["actor", "director", "other"]).optional(),
      limit: z.number().positive().max(50).default(20),
    })
  )
  .handler(async ({ data }) => {
    try {
      let whereConditions = [
        eq(userPeople.userId, data.userId),
        ilike(userPeople.personName, `%${data.query}%`),
      ];

      if (data.personType) {
        whereConditions.push(eq(userPeople.personType, data.personType));
      }

      const people = await db
        .select()
        .from(userPeople)
        .where(and(...whereConditions))
        .orderBy(desc(userPeople.createdAt))
        .limit(data.limit);

      return {
        success: true,
        people,
      };
    } catch (error) {
      console.error("Failed to search user people:", error);
      throw new Error("Failed to search person preferences");
    }
  });

// Legacy function for backward compatibility (actors only)
export const searchUserActors = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      userId: z.string().min(1, "User ID is required"),
      query: z.string().min(1, "Search query is required"),
      limit: z.number().positive().max(50).default(20),
    })
  )
  .handler(async ({ data }) => {
    try {
      const actors = await db
        .select()
        .from(userPeople)
        .where(
          and(
            eq(userPeople.userId, data.userId),
            eq(userPeople.personType, "actor"),
            ilike(userPeople.personName, `%${data.query}%`)
          )
        )
        .orderBy(desc(userPeople.createdAt))
        .limit(data.limit);

      return {
        success: true,
        actors,
      };
    } catch (error) {
      console.error("Failed to search user actors:", error);
      throw new Error("Failed to search actor preferences");
    }
  });

// Export schemas for reuse
export const schemas = {
  addPerson: addPersonSchema,
  updatePerson: updatePersonSchema,
  removePerson: removePersonSchema,
  getUserPeople: getUserPeopleSchema,
  searchUserPeople: z.object({
    userId: z.string().min(1, "User ID is required"),
    query: z.string().min(1, "Search query is required"),
    personType: z.enum(["actor", "director", "other"]).optional(),
    limit: z.number().positive().max(50).default(20),
  }),
};
