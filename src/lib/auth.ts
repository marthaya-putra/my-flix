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
  // better-auth rejects any request whose Origin != BETTER_AUTH_URL origin.
  // On Vercel, BETTER_AUTH_URL is the preview deploy's own URL, so the auth
  // client (same-origin) already matches. But cross-deploy flows (e.g. a
  // branch deploy's Origin header reaching the shared auth handler) and
  // localhost development need explicit trust. better-auth's matchesPattern
  // supports wildcards, so "https://*.vercel.app" covers every preview/branch
  // deploy without listing each one.
  trustedOrigins: [
    "http://localhost:3000",
    // Production + preview/branch deploys. Vercel's preview URL format is
    // https://my-flix-git-<branch>-<hash>-<team>.vercel.app — it starts with
    // the project name, so anchoring on "my-flix" scopes trust to only this
    // project's deploys and rejects unrelated Vercel apps.
    "https://my-flix*.vercel.app",
  ],
  plugins: [tanstackStartCookies()], // make sure this is the last plugin in the array
});
