import { pgTable, serial, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

// User preferences for movies and TV series
export const userPreferences = pgTable(
  'user_preferences',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    category: text('category').notNull(), // 'movie' | 'tv-series'
    genres: text('genres'), // comma-separated genre names
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('user_preferences_user_id_idx').on(table.userId),
    index('user_preferences_category_idx').on(table.category),
    uniqueIndex('user_preferences_user_id_title_category_unique').on(
      table.userId,
      table.title,
      table.category
    ),
  ]
);

// User preferences for actors and directors
export const userPeople = pgTable(
  'user_people',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    personName: text('person_name').notNull(),
    personType: text('person_type').notNull(), // 'actor' | 'director'
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('user_people_user_id_idx').on(table.userId),
    index('user_people_type_idx').on(table.personType),
    uniqueIndex('user_people_user_id_person_name_type_unique').on(
      table.userId,
      table.personName,
      table.personType
    ),
  ]
);

// Export types for TypeScript
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type UserPerson = typeof userPeople.$inferSelect;
export type NewUserPerson = typeof userPeople.$inferInsert;