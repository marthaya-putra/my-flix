// vitest.config.ts
// Mirrors the app's Vite pipeline (tsconfig paths + React plugin) and runs
// tests in a jsdom DOM so RTL works. See docs/adr/0002-test-strategy.md.
import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsConfigPaths(), viteReact()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Generated route tree isn't a test target; e2e tests belong to Playwright.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "src/routeTree.gen.ts",
      "**/*.e2e.ts",
    ],
    // Avoid stray open handles slowing CI: server-fn / network code is mocked
    // per-test, so there should be nothing real to wait on.
    clearMocks: true,
    restoreMocks: true,
  },
});
