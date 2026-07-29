import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "./db";

// Single auth instance built over the pooled DB singleton. Request isolation
// is preserved: postgres.js checks out an independent connection per query from
// the shared pool, so concurrent requests do not share query state. See
// docs/adr/0003-db-pooling.md.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want email verification
  },
  plugins: [tanstackStartCookies()], // make sure this is the last plugin in the array
});
