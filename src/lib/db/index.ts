import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Export database type
export type DB = PostgresJsDatabase<typeof schema>;

// Create Drizzle instance function - should be called within request handlers
export function getDb(): DB {
  // Connection string for PostgreSQL
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Create PostgreSQL client
  const client = postgres(connectionString, {
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    max: 10,
  });

  // Create and return Drizzle instance
  return drizzle(client, { schema });
}

// Export schema for convenience
export * from "./schema";

// Connection management functions
export async function closeConnection(db: DB) {
  // Note: With the current approach, each getDb() call creates a new client
  // In a production app, you might want to implement connection pooling
}

// Health check function
export async function checkConnection(db: DB) {
  try {
    await db.execute(`SELECT 1`);
    return { status: "connected", timestamp: new Date() };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}
