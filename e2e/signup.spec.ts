import { test, expect } from "@playwright/test";

import { signUp, completeTeenOnboarding, completeEmployerOnboarding, uniqueEmail } from "./helpers";

// Requires a real Supabase project (Auth included) reachable via .env.local — see
// README's "Testing" section. These aren't runnable against a mocked backend.

test.describe("signup + onboarding, one per role", () => {
  test("teen signs up, onboards, and lands on the teen dashboard", async ({ page }) => {
    await signUp(page, "teen", uniqueEmail("teen"));
    await completeTeenOnboarding(page, "Jamie Rivera");
    await expect(page.getByRole("heading", { name: /hi, jamie/i })).toBeVisible();
  });

  test("employer signs up, onboards, and lands on the employer dashboard", async ({ page }) => {
    await signUp(page, "employer", uniqueEmail("employer"));
    await completeEmployerOnboarding(page, "The Nguyen Family");
    await expect(page.getByRole("heading", { name: "The Nguyen Family" })).toBeVisible();
  });

  test("business signs up, onboards, and lands on the business dashboard", async ({ page }) => {
    await signUp(page, "business", uniqueEmail("business"));
    await completeEmployerOnboarding(page, "Riverside Cafe");
    await expect(page.getByRole("heading", { name: "Riverside Cafe" })).toBeVisible();
  });

  test("a teen hitting the employer dashboard is redirected, not just hidden nav", async ({ page }) => {
    await signUp(page, "teen", uniqueEmail("teen"));
    await completeTeenOnboarding(page, "Alex Kim");
    await page.goto("/dashboard/employer");
    await expect(page).toHaveURL(/\/dashboard\/teen/);
  });
});
