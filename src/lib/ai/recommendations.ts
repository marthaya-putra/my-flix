import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { ConsoleLogger } from "@mastra/core/logger";
import { MastraPlatformExporter, Observability } from "@mastra/observability";
import { z } from "zod";
import { safePromise } from "../utils/safe-promise";

// Plain function type
type GetRecommendationsInput = z.infer<typeof RecommendationInput>;

export type AIRecommendationsResult = Awaited<
  ReturnType<typeof getAIRecommendations>
>;

const RecommendationInput = z.object({
  previouslyLikedTvs: z
    .array(
      z.object({
        title: z.string(),
        year: z.number(),
      }),
    )
    .optional(),
  previouslyLikedMovies: z
    .array(
      z.object({
        title: z.string(),
        year: z.number(),
      }),
    )
    .optional(),
  dislikedMovies: z
    .array(
      z.object({
        title: z.string(),
        year: z.number(),
      }),
    )
    .optional(),
  dislikedTvs: z
    .array(
      z.object({
        title: z.string(),
        year: z.number(),
      }),
    )
    .optional(),
  previousRecommendations: z
    .array(
      z.object({
        id: z.number().optional(),
        title: z.string(),
        year: z.number(),
        category: z.enum(["movie", "tv"]),
      }),
    )
    .optional(),
  requestedMovies: z.number().int().min(0).default(3),
  requestedTvs: z.number().int().min(0).default(3),
  onlyCategory: z.enum(["movie", "tv"]),
  favoriteActors: z.array(z.string()).optional(),
  favoriteDirectors: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  excludeAdult: z.boolean().default(true),
  minImdbRating: z.number().min(0).max(10).optional(),
});

const RecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().describe("Movie or TV series title"),
      category: z.enum(["movie", "tv"]).describe("Either 'movie' or 'tv'"),
      releasedYear: z.number().describe("Year the content was released"),
      imdbRating: z.number().describe("IMDB rating for the title"),
      reason: z
        .string()
        .describe(
          "Casual, chatty tone — like texting a friend. Aim for ~180 characters (min 100, HARD MAX 220). No lists, no restating the title.",
        ),
    }),
  ),
});

// Issue #131: the model chain lives in Mastra's fallback routing. Mastra
// advances to the next entry on ANY step failure — provider error or
// structured-output schema violation (executeStreamWithFallbackModels has
// no error-type filter) — and throws only after the last entry fails, which
// the deficit loop maps to threw → generation_failed. gemini-2.5-flash is
// access-limited by Google; gemini-3.8-flash is the stable free-tier Flash.
const recommendationAgent = new Agent({
  id: "recommendationAgent",
  name: "recommendation-agent",
  // Static fallback only — every generate() call passes per-call
  // instructions that fully replace this default.
  instructions: "You are a movie and TV series recommendation expert.",
  model: [
    { model: google("gemini-3.8-flash") },
    { model: mistral("mistral-medium-latest") },
  ],
});

// Traces export to Mastra Cloud only when MASTRA_CLOUD_API_KEY is set;
// without it observability stays a no-op and local dev needs no key.
// Issue #131 asked for OTLP export; @mastra/core 1.79 ships no OTLP
// exporter — MastraPlatformExporter is the packaged path to the Mastra
// Cloud dashboard, so routing traces through it is the equivalent.
const cloudApiKey = process.env.MASTRA_CLOUD_API_KEY;

// Registering the agent wires logger + observability into it; the
// instance itself has no other caller yet (#132 adds the workflow).
new Mastra({
  agents: { recommendationAgent },
  logger: new ConsoleLogger({
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  }),
  observability: cloudApiKey
    ? new Observability({
        configs: {
          default: {
            serviceName: "my-flix",
            exporters: [
              new MastraPlatformExporter({ accessToken: cloudApiKey }),
            ],
          },
        },
      })
    : undefined,
});

// Plain AI recommendation function
export async function getAIRecommendations(input: GetRecommendationsInput) {
  // Spec 0005: translate to a category-flat shape here so buildPrompt is
  // a dumb template. Wrong-category liked/disliked lists are dropped
  // (token + focus win); favoriteActors/Directors/genres are category-
  // agnostic, kept on both. previousRecommendations scoped to same
  // category — cross-category dedup is enforced server-side by the ID
  // filter at survivor resolution.
  const isMovie = input.onlyCategory === "movie";
  const cleanData: PromptData = {
    role: isMovie ? "movie" : "TV series",
    likedLabel: isMovie ? "Liked movies" : "Liked TV shows",
    dislikedLabel: isMovie ? "User dislike movies" : "User dislike TV shows",
    liked: simplifyWatched(
      isMovie ? input.previouslyLikedMovies : input.previouslyLikedTvs,
    ),
    disliked: simplifyWatched(
      isMovie ? input.dislikedMovies : input.dislikedTvs,
    ),
    previousRecommendations: simplifyPrevRecs(input.previousRecommendations)
      .filter((r) => r.category === input.onlyCategory)
      .map(({ category, ...rest }) => rest),
    favoriteActors: input.favoriteActors ?? [],
    favoriteDirectors: input.favoriteDirectors ?? [],
    genres: input.genres ?? [],
  };

  const prompt = buildPrompt(cleanData);

  // Per-round system prompt stays the prompt's single source: passed as
  // per-call instructions (which fully replace any agent default) so the
  // dynamic rating-bar / category rules are always in force.
  // maxRetries: 0 disables ai-sdk-level retries — the Mastra fallback chain
  // owns all retry/failover. The old generateObject call's
  // providerOptions.gateway directive went with the Vercel AI Gateway;
  // routing now calls the providers directly, so there is no gateway to
  // configure.
  const [result, error] = await safePromise(
    recommendationAgent.generate(prompt, {
      instructions: `You are a ${cleanData.role} recommendation expert. Your PRIMARY DUTY is to analyze the user's viewing history and preferences to make PERSONALIZED recommendations.

        CRITICAL RULES:
        - User's previously liked content and favorite actors/directors are YOUR GUIDE - use these patterns religiously
        - For each recommendation, you MUST explicitly reference why it matches their taste based on their actual preferences
        - Look for: same actors, directors, genres, themes, tones, or similar storytelling styles
        - If user likes an actor, prioritize other content with that actor
        - If user likes a director, prioritize other films/shows by that director
        - If user likes specific genres, heavily favor those genres
        - Each recommendation reason MUST name the specific preference it's based on
        - REASON LENGTH IS CRITICAL: Aim for ~180 characters (min 100, HARD MAX 220 — enforced, longer ones get REJECTED). Write it like you're texting a friend — casual, chatty, fun. No lists, no restating the title.

        QUALITY CONTROL:
        - Recommend well-rated, critically acclaimed content that matches their taste
        ${
          input.minImdbRating !== undefined
            ? `- QUALITY BAR: ONLY include titles with an IMDB rating above ${input.minImdbRating}. If a title is below this bar, do not recommend it. It is better to return fewer titles than low-quality ones.`
            : "- Prefer titles with an IMDB rating of 7.0 or higher, but you may include a strong taste match with a lower rating."
        }
        - PRIORITIZE RECENT RELEASES: favor titles released in the last 10 years (${new Date().getFullYear() - 10}–${new Date().getFullYear()}). Older titles are allowed only as strong taste matches.
        - The IMDB rating field is REQUIRED for every recommendation - this is the rating users will see
        - Ensure IMDB ratings are accurate and current (use your knowledge of actual IMDB ratings)
        ${input.excludeAdult ? "- Exclude adult content (NC-17, XXX, etc.)" : ""}
        - DO NOT recommend any content that has been previously recommended to this user
        - NEVER recommend content the user has already marked as liked - they already know these titles!
        - ABSOLUTELY NO recommendations from their "ALREADY LIKED CONTENT" list
        - CRITICAL: NEVER recommend content from their "DISLIKED CONTENT" list - the user explicitly dislikes these titles!
        - CRITICAL: ONLY RECOMMEND REAL TITLE! DO NOT CHEAT BY ALTERING THE TITLE like: "The Dark Knight Trilogy (Extended Recommendation: Batman Begins)" or "The Departed (Alternate Recommendation: Scarface)"
        ${
          input.onlyCategory === "movie"
            ? `Return exactly ${input.requestedMovies} ${
                input.requestedMovies === 1 ? "MOVIE" : "MOVIES"
              }`
            : `Return exactly ${input.requestedTvs} TV SERIES`
        }`,
      structuredOutput: { schema: RecommendationSchema },
      modelSettings: { maxRetries: 0 },
    }),
  );

  if (error) {
    console.error("AI Recommendation Error:", error);
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause as any,
      },
    };
  }

  return { success: true, data: result.object };
}

function simplifyWatched(items?: Array<{ title: string; year: number }>) {
  return (items ?? []).map((i) => ({
    title: i.title,
    year: i.year,
  }));
}

function simplifyPrevRecs(
  items?: Array<{
    id?: number;
    title: string;
    year: number;
    category: "movie" | "tv";
  }>,
) {
  // LLM never sees IDs — strip them so exclude is enforced server-side only.
  return (items ?? []).map((i) => ({
    title: i.title,
    year: i.year,
    category: i.category,
  }));
}

// Spec 0005: buildPrompt takes a single flat, category-resolved shape —
// no branching inside. All category translation lives in cleanData above.
type PromptData = {
  role: string;
  likedLabel: string;
  dislikedLabel: string;
  liked: Array<{ title: string; year: number }>;
  disliked: Array<{ title: string; year: number }>;
  previousRecommendations: Array<{ title: string; year: number }>;
  favoriteActors: string[];
  favoriteDirectors: string[];
  genres: string[];
};

function buildPrompt(d: PromptData) {
  return `
The following is the user's taste profile.  
Recommend based on this USER PREFERENCES DATA SECTION:

==================== USER PREFERENCES DATA SECTION ========================
${d.likedLabel}: ${JSON.stringify(d.liked, null, 2)}
Actors: ${JSON.stringify(d.favoriteActors, null, 2)}
Directors: ${JSON.stringify(d.favoriteDirectors, null, 2)}
Genres: ${JSON.stringify(d.genres, null, 2)}
===================================================================

DO NOT recommend ANY movie or TV series in: DO NOT RECOMMEND SECTION

==================== DO NOT RECOMMEND SECTION =====================================
${d.dislikedLabel}: ${JSON.stringify(d.disliked, null, 2)}
Already recommended: ${JSON.stringify(d.previousRecommendations, null, 2)}
==================================================================================
`;
}
