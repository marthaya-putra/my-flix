import { describe, expect, it, vi } from "vitest";

// The observability branch of agents.ts (MASTRA_PLATFORM_ACCESS_TOKEN
// set) had never executed in any environment — tests mock this module,
// and no deploy had a token. This smoke test is the first code that
// constructs Observability + MastraPlatformExporter, so constructor
// regressions in @mastra/observability surface here instead of in
// production.
describe("agents module with observability enabled", () => {
  it("loads and constructs agents with a (dummy) platform token without throwing", async () => {
    vi.stubEnv("MASTRA_PLATFORM_ACCESS_TOKEN", "dummy-token-for-construction-only");
    try {
      const mod = await import("./agents");
      expect(mod.recommendationAgent).toBeDefined();
      expect(mod.tasteProfileAgent).toBeDefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
