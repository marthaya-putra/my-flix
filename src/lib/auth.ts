import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getDb } from "./db";

// Create new auth instance for each request to avoid I/O sharing
export function getAuth() {
  // Get fresh database instance for each request
  const db = getDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true if you want email verification
    },
    plugins: [tanstackStartCookies()], // make sure this is the last plugin in the array
  });
}

// Export a proxy that creates fresh auth instance on each access
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_, prop) {
    const authInstance = getAuth();
    return authInstance[prop as keyof typeof authInstance];
  }
});
