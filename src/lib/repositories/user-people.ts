import { z } from "zod";
import { userPeople, NewUserPerson, DB } from "@/lib/db";
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
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
});

// Plain functions for user people preferences (actors and directors)
export async function addUserPerson(db: DB, data: z.infer<typeof addPersonSchema>) {
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
      // Person already exists, return success with the existing person
      return {
        success: true,
        person: existing[0],
      };
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
}


export async function getUserPeople(db: DB, data: z.infer<typeof getUserPeopleSchema>) {
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

    if (data.offset && data.offset > 0) {
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
}


export async function updateUserPerson(db: DB, data: z.infer<typeof updatePersonSchema>) {
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
}


export async function removeUserPerson(db: DB, data: z.infer<typeof removePersonSchema>) {
  try {
    const result = await db
      .delete(userPeople)
      .where(
        and(eq(userPeople.id, data.id), eq(userPeople.userId, data.userId))
      )
      .returning();

    return {
      success: true,
      deletedPerson: result.length > 0 ? result[0] : null,
      deletedCount: result.length,
    };
  } catch (error) {
    console.error("Failed to remove user person:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to remove person preference"
    );
  }
}


export async function searchUserPeople(db: DB, data: {
  userId: string;
  query: string;
  personType?: "actor" | "director" | "other";
  limit?: number;
}) {
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
      .limit(data.limit || 20);

    return {
      success: true,
      people,
    };
  } catch (error) {
    console.error("Failed to search user people:", error);
    throw new Error("Failed to search person preferences");
  }
}


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
    limit: z.number().positive().default(20),
  }),
};