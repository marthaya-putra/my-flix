import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";

export const googleModel = google("gemini-2.5-flash");
export const mistralModel = mistral("mistral-large-latest");

export const modelRegistry = {
  google: googleModel,
  mistral: mistralModel,
} as const;

export type ModelName = keyof typeof modelRegistry;
