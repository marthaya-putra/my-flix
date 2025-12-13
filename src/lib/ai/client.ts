import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const aiClient = google("gemini-2.5-flash");
// export const aiClient = mistral("mistral-large-latest");

// const openrouter = createOpenRouter({
//   apiKey: process.env.OPENROUTER_API_KEY,
// });
// export const aiClient = openrouter.completion(
//   "nex-agi/deepseek-v3.1-nex-n1:free"
// );
