import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { client, db } from './index';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' /**
 * Run database migrations
 * This function should be called when starting the application
 * to ensure the database schema is up to date.
 */});

export async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus() {
  try {
    const result = await db.select().from(require('./schema').__drizzle_migrations);
    return result;
  } catch (error) {
    console.error('Failed to get migration status:', error);
    return [];
  }
}

/**
 * Close database connection
 */
export async function closeConnection() {
  await client.end();
}