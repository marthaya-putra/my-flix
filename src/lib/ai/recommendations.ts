import { generateObject } from "ai";
import { LanguageModelV2 } from "@ai-sdk/provider";
import { z } from "zod";
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
      })
    )
    .optional(),
  previouslyLikedMovies: z
    .array(
      z.object({
        title: z.string(),
        year: z.number(),
      })
    )
    .optional(),
  dislikedMovies: z
    .array(
      z.object({
        title: z.string(),
        year: z.number(),
      })
    )
    .optional(),
  dislikedTvs: z
    .array(
      z.object({
        title: z.string(),
        year: z.number(),
      })
    )
    .optional(),
  previousRecommendations: z
    .array(
      z.object({
        title: z.string(),
        year: z.number(),
        category: z.enum(["movie", "tv"]),
      })
    )
    .optional(),
  favoriteActors: z.array(z.string()).optional(),
  favoriteDirectors: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  excludeAdult: z.boolean().default(true),
});

const RecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().describe("Movie or TV series title"),
      category: z.enum(["movie", "tv"]).describe("Either 'movie' or 'tv'"),
      releasedYear: z.number().describe("Year the content was released"),
      imdbRating: z.number().describe("IMDB rating for the title"),
      reason: z.string().describe("Brief reason why this is recommended"),
    })
  ),
});

// Plain AI recommendation function
export async function getAIRecommendations(
  input: GetRecommendationsInput,
  model: LanguageModelV2
) {
  try {
    const cleanData = {
      previouslyLikedMovies: simplifyWatched(input.previouslyLikedMovies),
      previouslyLikedTvs: simplifyWatched(input.previouslyLikedTvs),
      dislikedMovies: simplifyWatched(input.dislikedMovies),
      dislikedTvs: simplifyWatched(input.dislikedTvs),
      previousRecommendations: simplifyPrevRecs(input.previousRecommendations),
      favoriteActors: input.favoriteActors ?? [],
      favoriteDirectors: input.favoriteDirectors ?? [],
      genres: input.genres ?? [],
      excludeAdult: input.excludeAdult ?? true,
    };

    const prompt = buildPrompt(cleanData);
    const { object } = await generateObject({
      model,
      providerOptions: {
        gateway: {
          models: [],
        },
      },
      schema: RecommendationSchema,
      maxRetries: 0,
      system: `You are a movie and TV series recommendation expert. Your PRIMARY DUTY is to analyze the user's viewing history and preferences to make PERSONALIZED recommendations.

        CRITICAL RULES:
        - User's previously liked content and favorite actors/directors are YOUR GUIDE - use these patterns religiously
        - For each recommendation, you MUST explicitly reference why it matches their taste based on their actual preferences
        - Look for: same actors, directors, genres, themes, tones, or similar storytelling styles
        - If user likes an actor, prioritize other content with that actor
        - If user likes a director, prioritize other films/shows by that director
        - If user likes specific genres, heavily favor those genres
        - Each recommendation reason MUST mention specific preferences it's based on

        QUALITY CONTROL:
        - Recommend well-rated, critically acclaimed content that matches their taste
        - The IMDB rating field is REQUIRED for every recommendation - this is the rating users will see
        - Ensure IMDB ratings are accurate and current (use your knowledge of actual IMDB ratings)
        ${input.excludeAdult ? "- Exclude adult content (NC-17, XXX, etc.)" : ""}
        - DO NOT recommend any content that has been previously recommended to this user
        - NEVER recommend content the user has already marked as liked - they already know these titles!
        - ABSOLUTELY NO recommendations from their "ALREADY LIKED CONTENT" list
        - CRITICAL: NEVER recommend content from their "DISLIKED CONTENT" list - the user explicitly dislikes these titles!
        - CRITICAL: ONLY RECOMMEND REAL TITLE! DO NOT CHEAT BY ALTERING THE TITLE like: "The Dark Knight Trilogy (Extended Recommendation: Batman Begins)" or "The Departed (Alternate Recommendation: Scarface)"
        - Return exactly 6 recommendations (3 MOVIES and 3 TV SERIES)`,
      prompt,
    });

    return { success: true, data: object };
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              cause: error.cause as any,
            }
          : "Unknown error occurred",
    };
  }
}

function simplifyWatched(items?: Array<{ title: string; year: number }>) {
  return (items ?? []).map((i) => ({
    title: i.title,
    year: i.year,
  }));
}

function simplifyPrevRecs(
  items?: Array<{ title: string; year: number; category: "movie" | "tv" }>
) {
  return (items ?? []).map((i) => ({
    title: i.title,
    year: i.year,
    category: i.category,
  }));
}

function buildPrompt(cleanData: {
  previouslyLikedMovies: Array<{ title: string; year: number }>;
  previouslyLikedTvs: Array<{ title: string; year: number }>;
  dislikedMovies: Array<{ title: string; year: number }>;
  dislikedTvs: Array<{ title: string; year: number }>;
  previousRecommendations: Array<{
    title: string;
    year: number;
  }>;
  favoriteActors: string[];
  favoriteDirectors: string[];
  genres: string[];
  excludeAdult: boolean;
}) {
  return `
The following is the user's taste profile.  
Recommend based on this USER PREFERENCES DATA SECTION:

==================== USER PREFERENCES DATA SECTION ========================
Movies: ${JSON.stringify(cleanData.previouslyLikedMovies, null, 2)}
TVs: ${JSON.stringify(cleanData.previouslyLikedTvs, null, 2)}
Actors: ${JSON.stringify(cleanData.favoriteActors, null, 2)}
Directors: ${JSON.stringify(cleanData.favoriteDirectors, null, 2)}
Genres: ${JSON.stringify(cleanData.genres, null, 2)}
===================================================================

DO NOT recommend ANY movie or TV series in: DO NOT RECOMMEND SECTION

==================== DO NOT RECOMMEND SECTION =====================================
User dislike movies: ${JSON.stringify(cleanData.dislikedMovies, null, 2)}
User dislike TV shows: ${JSON.stringify(cleanData.dislikedTvs, null, 2)}
Already recommended: ${JSON.stringify(cleanData.previousRecommendations, null, 2)}
==================================================================================
`;
}
