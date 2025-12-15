import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { config } from 'dotenv';
import postgres from 'postgres';
import * as schema from './schema';

// Load environment variables
config({ path: '.env' });

/**
 * Run database migrations
 * This function should be called when starting the application
 * to ensure the database schema is up to date.
 */
export async function runMigrations() {
  let client: ReturnType<typeof postgres> | undefined;
  let db: ReturnType<typeof drizzle> | undefined;

  try {
    // Create a dedicated client for migrations using environment variable
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5433/myflix";

    client = postgres(connectionString, {
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
      max: 1,
    });
    db = drizzle(client, { schema });

    await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Clean up migration connection
    if (client) {
      await client.end();
    }
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus() {
  let client: ReturnType<typeof postgres> | undefined;
  let db: ReturnType<typeof drizzle> | undefined;

  try {
    // Create a dedicated client for migration status using environment variable
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5433/myflix";

    client = postgres(connectionString, {
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
      max: 1,
    });
    db = drizzle(client, { schema });

    // __drizzle_migrations table might not be exported, so we use raw query
    const result = await client`SELECT * FROM __drizzle_migrations ORDER BY id DESC`;
    return result;
  } catch (error) {
    console.error('Failed to get migration status:', error);
    return [];
  } finally {
    // Clean up connection
    if (client) {
      await client.end();
    }
  }
}