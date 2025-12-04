-- Clear existing preferences data since year field is now required
DELETE FROM "user_preferences";

-- Add non-nullable year column
ALTER TABLE "user_preferences" ADD COLUMN "year" integer NOT NULL;