import { getDb } from "@/lib/db";
import { getUserPreferences } from "@/lib/repositories/user-preferences";
import { getUserPeople } from "@/lib/repositories/user-people";
import { getUserDislikes } from "@/lib/repositories/user-dislikes";
import type { UserContent } from "./preferences";

// Server-only module (Spec 0006). loadUserContent lives here — separate from
// preferences.ts — so it is never reachable from the client bundle. The
// client imports like/dislike server fns from preferences.ts; if
// loadUserContent stayed there, its top-level `getDb()` import (→ postgres →
// Buffer) would survive TanStack Start's createServerFn stripping and throw
// "Buffer is not defined" in the browser. createServerFn handlers that call
// loadUserContent via a static import are themselves stripped on the client,
// so their import of this module is tree-shaken away. Callers that aren't
// wrapped in createServerFn (the NDJSON stream route) must reach this via a
// dynamic import() inside a server-only code path.

const EMPTY_USER_CONTENT: UserContent = {
  movies: [],
  tvs: [],
  dislikedMovies: [],
  dislikedTvs: [],
  actors: [],
  directors: [],
  genres: [],
};

// Load a user's full preference/dislike/people profile from the DB.
// Pure (no request context) so any server code with a userId can call it —
// the streaming route uses this to build its exclude set authoritatively
// instead of trusting a client payload.
export async function loadUserContent(userId: string): Promise<UserContent> {
  try {
    const db = getDb();
    const [preferencesResponse, peopleResponse, dislikesResponse] =
      await Promise.all([
        getUserPreferences(db, { userId }),
        getUserPeople(db, { userId }),
        getUserDislikes(db, { userId }),
      ]);

    const preferences = preferencesResponse.success
      ? preferencesResponse.preferences
      : [];
    const people = peopleResponse.success ? peopleResponse.people : [];
    const dislikes = dislikesResponse.success ? dislikesResponse.dislikes : [];

    const allGenres = preferences
      .filter((p) => p.genres)
      .map((p) => p.genres!.split(",").map((genre) => genre.trim()))
      .flat()
      .filter((genre) => genre.length > 0);
    const uniqueGenres = [...new Set(allGenres)];

    return {
      movies: preferences
        .filter((p) => p.category === "movie")
        .map((p) => ({ id: p.preferenceId, title: p.title, year: p.year })),
      tvs: preferences
        .filter((p) => p.category === "tv-series")
        .map((p) => ({ id: p.preferenceId, title: p.title, year: p.year })),
      dislikedMovies: dislikes
        .filter((d) => d.category === "movie")
        .map((d) => ({ id: d.preferenceId, title: d.title, year: d.year })),
      dislikedTvs: dislikes
        .filter((d) => d.category === "tv-series")
        .map((d) => ({ id: d.preferenceId, title: d.title, year: d.year })),
      actors: people
        .filter((p) => p.personType === "actor")
        .map((p) => p.personName),
      directors: people
        .filter((p) => p.personType === "director")
        .map((p) => p.personName),
      genres: uniqueGenres,
    };
  } catch (error) {
    console.error("Failed to load user preferences:", error);
    return EMPTY_USER_CONTENT;
  }
}
