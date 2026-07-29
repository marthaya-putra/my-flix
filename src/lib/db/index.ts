import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Export database type
export type DB = PostgresJsDatabase<typeof schema>;

// Module-level pooled client. postgres.js returns a pooled connection by
// default: each query checks out an independent connection from the pool, so a
// single shared client is safe across concurrent requests. See
// docs/adr/0003-db-pooling.md.
//
// Cached on globalThis to survive Next.js/Vite dev HMR without leaking sockets.
type DbGlobal = typeof globalThis & {
  __db?: { sql: ReturnType<typeof postgres>; db: DB };
};

const globalDb = globalThis as DbGlobal;

function createDb(): DB {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  if (globalDb.__db) {
    return globalDb.__db.db;
  }

  const sql = postgres(connectionString, {
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    max: 10,
  });

  const db = drizzle(sql, { schema });
  globalDb.__db = { sql, db };
  return db;
}

// Pooled Drizzle instance shared across all requests. Callers that still use
// getDb() get the same singleton; prefer importing `db` directly.
export const db: DB = createDb();

// Returns the shared pooled instance. Retained so existing call sites need no
// changes; new code should import `db` directly.
export function getDb(): DB {
  return db;
}

// Export schema for convenience
export * from "./schema";

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
