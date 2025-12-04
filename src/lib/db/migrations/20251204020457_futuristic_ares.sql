DROP INDEX "user_people_user_id_person_name_type_unique";--> statement-breakpoint
DROP INDEX "user_preferences_user_id_title_category_unique";--> statement-breakpoint
DELETE FROM "user_people";--> statement-breakpoint
DELETE FROM "user_preferences";--> statement-breakpoint
ALTER TABLE "user_people" ADD COLUMN "person_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "preference_id" integer NOT NULL;--> statement-breakpoint
CREATE INDEX "user_people_person_id_idx" ON "user_people" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_people_user_id_person_id_unique" ON "user_people" USING btree ("user_id","person_id");--> statement-breakpoint
CREATE INDEX "user_preferences_preference_id_idx" ON "user_preferences" USING btree ("preference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_id_preference_id_unique" ON "user_preferences" USING btree ("user_id","preference_id");