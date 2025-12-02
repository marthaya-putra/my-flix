import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables from .env.local file (Vite/TanStack Start convention)
config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/myflix';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
  // Migration specific settings
  migrations: {
    prefix: 'timestamp',
    schema: 'public',
  },
});