CREATE TABLE IF NOT EXISTS "user_people" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"person_name" text NOT NULL,
	"person_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"genres" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_people_user_id_idx" ON "user_people" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_people_type_idx" ON "user_people" USING btree ("person_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_people_user_id_person_name_type_unique" ON "user_people" USING btree ("user_id","person_name","person_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_preferences_user_id_idx" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_preferences_category_idx" ON "user_preferences" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_title_category_unique" ON "user_preferences" USING btree ("user_id","title","category");