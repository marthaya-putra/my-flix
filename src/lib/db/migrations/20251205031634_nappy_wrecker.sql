CREATE TYPE "public"."category" AS ENUM('movie', 'tv-series');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('actor', 'director', 'other');--> statement-breakpoint
CREATE TABLE "user_dislikes" (
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
ALTER TABLE "user_people" ALTER COLUMN "person_type" SET DATA TYPE "public"."person_type" USING "person_type"::"public"."person_type";--> statement-breakpoint
ALTER TABLE "user_preferences" ALTER COLUMN "category" SET DATA TYPE "public"."category" USING "category"::"public"."category";--> statement-breakpoint
CREATE INDEX "user_dislikes_user_id_idx" ON "user_dislikes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_dislikes_preference_id_idx" ON "user_dislikes" USING btree ("preference_id");--> statement-breakpoint
CREATE INDEX "user_dislikes_category_idx" ON "user_dislikes" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "user_dislikes_user_id_preference_id_unique" ON "user_dislikes" USING btree ("user_id","preference_id");