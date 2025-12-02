import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string for PostgreSQL
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/myflix';

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create PostgreSQL client
const client = postgres(connectionString, {
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
  max: 10,
});

// Create Drizzle instance
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema';

// Connection management functions
export async function closeConnection() {
  await client.end();
}

// Health check function
export async function checkConnection() {
  try {
    await client`SELECT 1`;
    return { status: 'connected', timestamp: new Date() };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}