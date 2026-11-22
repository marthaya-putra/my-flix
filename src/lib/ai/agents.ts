import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { ConsoleLogger } from "@mastra/core/logger";
import { MastraPlatformExporter, Observability } from "@mastra/observability";

// Shared Mastra agents (#131/#135, extended by the title-first design).
// The model chain lives in Mastra's fallback routing: Mastra advances to
// the next entry on ANY step failure — provider error or structured-output
// schema violation — and throws only after the last entry fails, which
// callers map to their failure status. gemini-2.5-flash is access-limited
// by Google; gemini-3.8-flash is the stable free-tier Flash.
//
// Both agents share one chain and one Mastra registration so logger +
// observability wire once. Instructions here are static defaults only —
// every generate() call passes per-call instructions that fully replace
// them.
const MODEL_CHAIN = [
  { model: google("gemini-3.8-flash") },
  { model: mistral("mistral-medium-latest") },
];

export const recommendationAgent = new Agent({
  id: "recommendationAgent",
  name: "recommendation-agent",
  instructions: "You are a movie and TV series recommendation expert.",
  model: MODEL_CHAIN,
});

// Per-run taste profile (title-first design §2): distills liked titles +
// favorite people into bounded theme/tone/summary fields. The 8s total
// budget is enforced at the call site (taste-profile.ts), not here.
export const tasteProfileAgent = new Agent({
  id: "tasteProfileAgent",
  name: "taste-profile-agent",
  instructions: "You distill a viewer's taste pattern.",
  model: MODEL_CHAIN,
});

// Traces export to the Mastra platform only when
// MASTRA_PLATFORM_ACCESS_TOKEN is set (the canonical platform var name —
// the same token `mastra init` writes); without it observability stays a
// no-op and local dev needs no key. MASTRA_PROJECT_ID and the endpoint
// vars are read from env by the exporter itself (resolveFromEnv default).
// Issue #131 asked for OTLP export; @mastra/core 1.79 ships no OTLP
// exporter — MastraPlatformExporter is the packaged path to the platform
// dashboard, so routing traces through it is the equivalent.
const platformAccessToken = process.env.MASTRA_PLATFORM_ACCESS_TOKEN;

// Env changes do not reach running instances — observability silently off
// in prod means traces vanish with no error anywhere. Warn once per cold
// start so a missing key is found in logs, not discovered weeks later.
if (!platformAccessToken && process.env.NODE_ENV === "production") {
  console.warn(
    "[mastra] MASTRA_PLATFORM_ACCESS_TOKEN not set — observability disabled, traces will not export",
  );
}

// Registering the agents wires logger + observability into them.
new Mastra({
  agents: { recommendationAgent, tasteProfileAgent },
  logger: new ConsoleLogger({
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  }),
  observability: platformAccessToken
    ? new Observability({
        configs: {
          default: {
            serviceName: "my-flix",
            exporters: [
              new MastraPlatformExporter({ accessToken: platformAccessToken }),
            ],
          },
        },
      })
    : undefined,
});
