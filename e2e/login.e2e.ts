// e2e/login.e2e.ts
// ADR 0002 — the first passing example of the E2E smoke layer. /login needs
// no DB seed and no TMDB, so it is the cheapest canary for the SSR + router
// wiring. If this breaks, something fundamental in router.tsx / __root.tsx
// broke before any unit test would notice.
import { expect, test } from "@playwright/test";

test.describe("/login smoke", () => {
  test("SSR-renders the login card without a server error", async ({
    page,
  }) => {
    const response = await page.goto("/login");
    expect(response?.ok()).toBe(true);
    // Static SSR string from src/routes/login.tsx — proves the route
    // component rendered server-side, not just a blank shell. (CardTitle is
    // a styled <div>, not a heading element, so we match by text instead of
    // by the `heading` role.)
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("links to /sign-up", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.getByRole("link", { name: "Sign up" });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute("href", "/sign-up");
  });
});
