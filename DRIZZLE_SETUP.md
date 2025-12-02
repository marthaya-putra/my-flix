# Drizzle ORM Setup Guide

This guide explains the Drizzle ORM setup for the MyFlix project.

## Database Configuration

### PostgreSQL Container
The project uses PostgreSQL running in Docker on port 5433 (to avoid conflicts with local PostgreSQL).

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    container_name: myflix-db
    ports:
      - "5433:5432"  # Maps container port 5432 to host port 5433
```

### Environment Variables
Create a `.env` file with the following:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5433/myflix
```

## Available Commands

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Generate migrations from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio

# Push schema directly (for development)
npm run db:push

# Check configuration and connections
npm run db:check
```

## Migration Workflow

1. **Make schema changes** in `src/lib/db/schema.ts`
2. **Generate migration**: `npm run db:generate`
3. **Review migration** in `src/lib/db/migrations/`
4. **Apply migration**: `npm run db:migrate`

## File Structure

```
src/lib/db/
├── schema.ts          # Database schema definitions
├── index.ts           # Database connection and client
├── migrate.ts         # Migration utilities
└── migrations/        # Generated migration files
    └── 0000_absent_terrax.sql
```

## Best Practices

1. **Always use environment variables** for database credentials
2. **Use generate → migrate workflow**, not push in production
3. **Review generated migrations** before applying
4. **Keep database connection in a central file** (`index.ts`)
5. **Use connection pooling** for better performance
6. **Test migrations** in development before production

## Database Tables

### user_preferences
Stores user movie/TV series preferences with genres.

### user_people
Stores user preferences for actors and directors with person type classification.

### __drizzle_migrations
Tracks migration history automatically managed by Drizzle.

## Connection Details

- **Host**: localhost
- **Port**: 5433
- **Database**: myflix
- **Username**: postgres
- **Password**: password

## Troubleshooting

### Port Conflicts
If you have local PostgreSQL running, the container uses port 5433 to avoid conflicts.

### Connection Issues
1. Ensure Docker container is running: `docker ps`
2. Check database exists: `docker exec myflix-db psql -U postgres -l`
3. Verify connection string in `.env` file
4. Check network connectivity to port 5433

### Migration Issues
1. Check migration file syntax
2. Ensure database is accessible
3. Verify drizzle.config.ts settings
4. Check environment variables are loaded