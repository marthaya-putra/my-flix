import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { aiClient } from "./client";

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
  dislikedContent: z
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
      reason: z.string().describe("Brief reason why this is recommended"),
    })
  ),
});

export const getRecommendations = createServerFn({
  method: "POST",
})
  .inputValidator(RecommendationInput)
  .handler(async ({ data }) => {
    try {
      const cleanData = {
        previouslyLikedMovies: simplifyWatched(data.previouslyLikedMovies),
        previouslyLikedTvs: simplifyWatched(data.previouslyLikedTvs),
        dislikedContent: simplifyDisliked(data.dislikedContent),
        previousRecommendations: simplifyPrevRecs(data.previousRecommendations),
        favoriteActors: data.favoriteActors ?? [],
        favoriteDirectors: data.favoriteDirectors ?? [],
        genres: data.genres ?? [],
        excludeAdult: data.excludeAdult ?? true,
      };

      const prompt = buildPrompt(cleanData);
      const { object } = await generateObject({
        model: aiClient,
        schema: RecommendationSchema,
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
        ${data.excludeAdult ? "- Exclude adult content (NC-17, XXX, etc.)" : ""}
        - DO NOT recommend any content that has been previously recommended to this user
        - NEVER recommend content the user has already marked as liked - they already know these titles!
        - ABSOLUTELY NO recommendations from their "ALREADY LIKED CONTENT" list
        - CRITICAL: NEVER recommend content from their "DISLIKED CONTENT" list - the user explicitly dislikes these titles!
        - Return exactly 6 recommendations`,
        prompt,
      });

      return { success: true, data: object };
    } catch (error) {
      console.error("AI Recommendation Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

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

function simplifyDisliked(items?: Array<{ title: string; year: number }>) {
  return (items ?? []).map((i) => ({
    title: i.title,
    year: i.year,
  }));
}

function buildPrompt(cleanData: {
  previouslyLikedMovies: Array<{ title: string; year: number }>;
  previouslyLikedTvs: Array<{ title: string; year: number }>;
  dislikedContent: Array<{
    title: string;
    year: number;
  }>;
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
You are a movie/TV recommendation engine.

The following is the user's taste profile.  
All data has already been simplified and cleaned by the backend.  
DO NOT attempt to extract or transform anything further.

==================== USER DATA ====================
${JSON.stringify(cleanData, null, 2)}
===================================================

The data includes:
- previouslyLikedMovies: [{ title, year }]
- previouslyLikedTvs: [{ title, year }]
- dislikedContent: [{ title, year }]
- previousRecommendations: [{ title, year, category }]
- favoriteActors: string[]
- favoriteDirectors: string[]
- genres: string[]
- excludeAdult: boolean

=====================================================
= EXCLUSION RULES                                   =
=====================================================

Before recommending ANY movie or TV series:

1. Reject anything whose title appears in previouslyLikedMovies.
2. Reject anything whose title appears in previouslyLikedTvs.
3. Reject anything whose title appears in dislikedContent.
4. Reject anything whose title appears in previousRecommendations.
5. If excludeAdult = true → reject adult content.
6. If a title is already known to user, DO NOT recommend it.

You must strictly follow this. Never break exclusion rules.
IMPORTANT: The user has explicitly DISLIKED the content in the dislikedContent list - ABSOLUTELY NEVER recommend anything from this list under any circumstances.

=====================================================
= RECOMMENDATION GUIDELINES                         =
=====================================================

Recommend EXACTLY 6 NEW titles total.

Rules:
- They must be a mix of movies or TV series (any balance).
- Each recommendation must include: title, year, category.
- Each explanation must be SPECIFIC and PERSONALIZED.

Specificity requirements:
- Mention which genres match.
- Mention which actors/directors match their favorites.
- Cite exact previously liked titles (title + year) and explain the connection.
- Explain tonal / thematic similarity (not generic).
`;
}
