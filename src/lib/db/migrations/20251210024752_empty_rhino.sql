-- Create enum types idempotently
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'category'
    ) THEN
        CREATE TYPE "public"."category" AS ENUM('movie', 'tv-series');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'person_type'
    ) THEN
        CREATE TYPE "public"."person_type" AS ENUM('actor', 'director', 'other');
    END IF;
END$$;

--> statement-breakpoint

-- Create tables idempotently
CREATE TABLE IF NOT EXISTS "user_dislikes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"preference_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer NOT NULL,
	"category" "category" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_people" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"person_id" integer NOT NULL,
	"person_name" text NOT NULL,
	"person_type" "person_type" NOT NULL,
	"profile_path" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"preference_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer NOT NULL,
	"category" "category" NOT NULL,
	"genres" text,
	"poster_path" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Create indexes idempotently
CREATE INDEX IF NOT EXISTS "user_dislikes_user_id_idx" ON "user_dislikes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_dislikes_preference_id_idx" ON "user_dislikes" USING btree ("preference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_dislikes_category_idx" ON "user_dislikes" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_dislikes_user_id_preference_id_unique" ON "user_dislikes" USING btree ("user_id","preference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_people_user_id_idx" ON "user_people" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_people_person_id_idx" ON "user_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_people_type_idx" ON "user_people" USING btree ("person_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_people_user_id_person_id_unique" ON "user_people" USING btree ("user_id","person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_preferences_user_id_idx" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_preferences_preference_id_idx" ON "user_preferences" USING btree ("preference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_preferences_category_idx" ON "user_preferences" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_preference_id_unique" ON "user_preferences" USING btree ("user_id","preference_id");