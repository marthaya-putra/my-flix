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
        - DO NOT recommend any content the user has already marked as liked
        - Return exactly 5 recommendations`,
        prompt: `USER'S TASTE PROFILE - STUDY THIS CAREFULLY:

        ${data.previouslyLikedMovies && data.previouslyLikedMovies.length > 0 ? `
        🎬 MOVIES THEY LOVE:
        ${data.previouslyLikedMovies.map((movie) => `- ${movie.title} (${movie.year})`).join("\n")}
        ` : 'No movies specified'}

        ${data.previouslyLikedTvs && data.previouslyLikedTvs.length > 0 ? `
        📺 TV SHOWS THEY LOVE:
        ${data.previouslyLikedTvs.map((tv) => `- ${tv.title} (${tv.year})`).join("\n")}
        ` : 'No TV shows specified'}

        ${data.favoriteActors && data.favoriteActors.length > 0 ? `
        👥 FAVORITE ACTORS:
        ${data.favoriteActors.map(actor => `- ${actor}`).join("\n")}
        ` : 'No favorite actors specified'}

        ${data.favoriteDirectors && data.favoriteDirectors.length > 0 ? `
        🎭 FAVORITE DIRECTORS:
        ${data.favoriteDirectors.map(director => `- ${director}`).join("\n")}
        ` : 'No favorite directors specified'}

        ${data.genres && data.genres.length > 0 ? `
        🎭 PREFERRED GENRES:
        ${data.genres.map(genre => `- ${genre}`).join("\n")}
        ` : 'No genre preferences specified'}

        🚫 PREVIOUSLY RECOMMENDED (DO NOT RECOMMEND AGAIN):
        ${data.previousRecommendations?.map((rec) => `- ${rec.title} (${rec.year}) - ${rec.category}`).join("\n") || "None"}

        🔞 Adult Content: ${data.excludeAdult ? 'EXCLUDED' : 'ALLOWED'}

        YOUR TASK:
        Analyze their viewing history and preferences intensely. Look for patterns in:
        • What actors/directors they repeatedly enjoy
        • What genres/themes appear in their favorites
        • What era/style of content they prefer
        • What storytelling techniques seem to appeal to them

        RECOMMENDATION STRATEGY:
        1. Prioritize content featuring their favorite actors/directors
        2. Focus heavily on their preferred genres
        3. Find content with similar tones/themes to what they already love
        4. Each recommendation MUST connect to specific preferences above

        CRITICAL: Your reasoning must be EXTREMELY specific and personal. Do NOT give generic recommendations.

        ❌ BAD EXAMPLES:
        - "Because you like sci-fi movies"
        - "This has action and drama like your favorites"
        - "Fans of thrillers would enjoy this"
        - "Similar tone to what you watch"

        ✅ GOOD EXAMPLES:
        - "Because you loved Christopher Nolan's directing style in Inception, you'll enjoy his work in Tenet"
        - "Since you loved Ryan Gosling's performance in La La Land (2016), watch him in The Nice Guys (2016)"
        - "You loved the psychological thriller aspect of Black Mirror, so try Westworld for similar themes"
        - "Because you enjoyed Queen's Gambit's character development, The Crown offers the same quality storytelling"

        REQUIREMENTS:
        - Mention specific titles/years from their favorites
        - Reference specific actors, directors, or themes they love
        - Show direct connections between their liked content and recommendations
        - No generic "if you like X, try Y" - be specific about WHY

        Recommend 5 movies or TV series with title, category, year, and ULTRA-SPECIFIC personal reasoning.`,
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

export const testAI = createServerFn({
  method: "POST",
})
  .inputValidator(RecommendationInput)
  .handler(async ({ data }) => {
    return getRecommendations({ data });
  });
