import { generateObject } from "ai";
import { z } from "zod";
import { callWithFallback } from "./call-with-fallback";
import { googleModel, mistralModel } from "./models";

// Per-run taste profile (design doc Components §2). One small LLM call
// distills the user's liked titles + favorite people into themes, tones,
// plot affinities, and a summary. Computed fresh each run, never stored;
// every failure path resolves null so the reco prompt stays as today's.

// Bounds from the design: each array ≤6 items, each item ≤40 chars and
// anchored to a liked title where possible; summary ≤300 chars.
export const TasteProfileSchema = z.object({
  themes: z.array(z.string().min(1).max(40)).max(6),
  tones: z.array(z.string().min(1).max(40)).max(6),
  plotAffinities: z.array(z.string().min(1).max(40)).max(6),
  summary: z.string().min(1).max(300),
});
export type TasteProfile = z.infer<typeof TasteProfileSchema>;

// Structural input — UserContent satisfies this without an import (keeps
// this module free of data-layer dependencies). createdAt orders the
// recent-liked window; genres feed the in-memory genre counts.
export type TasteProfileContent = {
  movies: Array<{
    title: string;
    year: number;
    createdAt?: Date | null;
    genres?: string[];
  }>;
  tvs: Array<{
    title: string;
    year: number;
    createdAt?: Date | null;
    genres?: string[];
  }>;
  actors: string[];
  directors: string[];
};

// Total budget for the whole google→mistral loop (CUJ 2).
const PROFILE_TOTAL_TIMEOUT_MS = 8_000;
// The profile reads the last ≤100 liked titles, ordered by explicit
// createdAt desc — NOT the repo's default updatedAt ordering.
const RECENT_LIKED_LIMIT = 100;
// Hard cap on the rendered prompt section; schema bounds alone sum to
// ~1050 chars, this guards any future field growth.
const MAX_PROFILE_TEXT_CHARS = 1_200;

const PROFILE_MODELS = [
  { label: "google", model: googleModel },
  { label: "mistral", model: mistralModel },
];

const timeOf = (d?: Date | null) => (d ? d.getTime() : 0);

// Last ≤100 liked titles across both categories, newest first.
function recentLiked(content: TasteProfileContent) {
  return [
    ...content.movies.map((m) => ({ ...m, category: "movie" as const })),
    ...content.tvs.map((t) => ({ ...t, category: "tv" as const })),
  ]
    .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))
    .slice(0, RECENT_LIKED_LIMIT);
}

// In-memory genre counts over the recent-liked window (design doc: no
// TMDB fan-out, no SQL — the counts come from per-title genres).
function genreCountsOf(
  liked: Array<{ genres?: string[] }>,
): Array<{ genre: string; count: number }> {
  const counts = new Map<string, number>();
  for (const title of liked) {
    for (const genre of title.genres ?? []) {
      const key = genre.trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

function buildProfilePrompt(
  liked: Array<{ title: string; year: number; category: string }>,
  favoritePeople: string[],
  genreCounts: Array<{ genre: string; count: number }>,
): string {
  return `
Derive this user's taste pattern from the data below.

Liked titles (most recent first):
${liked.map((t) => `- ${t.title} (${t.year}, ${t.category})`).join("\n")}

Favorite people:
${favoritePeople.length ? favoritePeople.map((p) => `- ${p}`).join("\n") : "- (none)"}

Genre counts across liked titles:
${genreCounts.length ? genreCounts.map((g) => `- ${g.genre}: ${g.count}`).join("\n") : "- (none)"}
`;
}

// Generate the profile via the shared fallback helper. Resolves null on
// total failure, timeout, schema rejection, or empty input (nothing to
// distill — fail open to today's prompt).
export async function generateTasteProfile(
  content: TasteProfileContent,
): Promise<TasteProfile | null> {
  const liked = recentLiked(content);
  const favoritePeople = [...content.actors, ...content.directors];
  if (liked.length === 0 && favoritePeople.length === 0) return null;

  const genreCounts = genreCountsOf(liked);

  return callWithFallback(
    async (model, signal) => {
      const { object } = await generateObject({
        model,
        schema: TasteProfileSchema,
        maxRetries: 0,
        abortSignal: signal,
        system: `You distill a viewer's taste pattern. Output ONLY the schema fields.
Rules:
- Each array item is at most 40 characters and names a pattern, anchored to a liked title where possible (e.g. "cerebral sci-fi — Inception, Arrival").
- At most 6 items per array. Omit an array (empty) when the data does not support it.
- The summary is at most 300 characters and states what the user consistently gravitates toward.`,
        prompt: buildProfilePrompt(liked, favoritePeople, genreCounts),
      });
      // Re-validate: enforce the bounds deterministically even when a
      // provider response slips past the SDK's own schema check.
      const parsed = TasteProfileSchema.safeParse(object);
      if (!parsed.success) {
        throw new Error(
          `taste profile output rejected: ${parsed.error.message}`,
        );
      }
      return parsed.data;
    },
    PROFILE_MODELS,
    { timeoutMs: PROFILE_TOTAL_TIMEOUT_MS },
  );
}

// Single render template for the prompt's TASTE PROFILE section.
export function renderProfileText(profile: TasteProfile): string {
  const lines = [
    profile.themes.length > 0 ? `Themes: ${profile.themes.join("; ")}` : null,
    profile.tones.length > 0 ? `Tones: ${profile.tones.join("; ")}` : null,
    profile.plotAffinities.length > 0
      ? `Plot affinities: ${profile.plotAffinities.join("; ")}`
      : null,
    `Summary: ${profile.summary}`,
  ].filter((line): line is string => line !== null);
  return lines.join("\n").slice(0, MAX_PROFILE_TEXT_CHARS);
}
