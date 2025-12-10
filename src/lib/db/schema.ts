import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
  integer,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";

// Enum definitions
export const categoryEnum = pgEnum("category", ["movie", "tv-series"]);
export const personTypeEnum = pgEnum("person_type", [
  "actor",
  "director",
  "other",
]);

// User preferences for movies and TV series
export const userPreferences = pgTable(
  "user_preferences",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    preferenceId: integer("preference_id").notNull(), // TMDB ID
    title: text("title").notNull(),
    year: integer("year").notNull(), // Release year
    category: categoryEnum("category").notNull(), // 'movie' | 'tv-series'
    genres: text("genres"), // comma-separated genre names
    posterPath: text("poster_path"), // TMDB poster path
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("user_preferences_user_id_idx").on(table.userId),
    index("user_preferences_preference_id_idx").on(table.preferenceId),
    index("user_preferences_category_idx").on(table.category),
    uniqueIndex("user_preferences_user_id_preference_id_unique").on(
      table.userId,
      table.preferenceId
    ),
  ]
);

// User dislikes for movies and TV series
export const userDislikes = pgTable(
  "user_dislikes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    preferenceId: integer("preference_id").notNull(), // TMDB ID
    title: text("title").notNull(),
    year: integer("year").notNull(), // Release year
    category: categoryEnum("category").notNull(), // 'movie' | 'tv-series'
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("user_dislikes_user_id_idx").on(table.userId),
    index("user_dislikes_preference_id_idx").on(table.preferenceId),
    index("user_dislikes_category_idx").on(table.category),
    uniqueIndex("user_dislikes_user_id_preference_id_unique").on(
      table.userId,
      table.preferenceId
    ),
  ]
);

// User preferences for actors and directors
export const userPeople = pgTable(
  "user_people",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    personId: integer("person_id").notNull(), // TMDB ID
    personName: text("person_name").notNull(),
    personType: personTypeEnum("person_type").notNull(), // 'actor' | 'director' | 'other'
    profilePath: text("profile_path"), // TMDB profile path
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("user_people_user_id_idx").on(table.userId),
    index("user_people_person_id_idx").on(table.personId),
    index("user_people_type_idx").on(table.personType),
    uniqueIndex("user_people_user_id_person_id_unique").on(
      table.userId,
      table.personId
    ),
  ]
);

// Export types for TypeScript
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type UserDislike = typeof userDislikes.$inferSelect;
export type NewUserDislike = typeof userDislikes.$inferInsert;
export type UserPerson = typeof userPeople.$inferSelect;
export type NewUserPerson = typeof userPeople.$inferInsert;

// Auth

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
