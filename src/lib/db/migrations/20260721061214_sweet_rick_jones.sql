CREATE TABLE "user_watchlist" (
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
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_watchlist_user_id_idx" ON "user_watchlist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_watchlist_preference_id_idx" ON "user_watchlist" USING btree ("preference_id");--> statement-breakpoint
CREATE INDEX "user_watchlist_category_idx" ON "user_watchlist" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "user_watchlist_user_id_preference_id_unique" ON "user_watchlist" USING btree ("user_id","preference_id");