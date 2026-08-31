import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const TEST_PASSWORD = "TestPassword123!";

export async function signUp(page: Page, role: "teen" | "employer" | "business", email: string) {
  await page.goto("/signup");
  await page.getByRole("button", { name: new RegExp(role, "i") }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("Confirm password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(new RegExp(`/onboarding/${role}`));
}

export async function completeTeenOnboarding(page: Page, fullName: string) {
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Date of birth").fill("2010-01-01");
  await page.getByLabel("Parent/guardian email").fill(uniqueEmail("guardian"));
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel("Skills").fill("Babysitting, Yard work");
  await page.getByRole("button", { name: /finish/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/teen/);
}

export async function completeEmployerOnboarding(page: Page, displayName: string) {
  await page.getByLabel(/name/i).first().fill(displayName);
  await page.getByRole("button", { name: /finish/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/(employer|business)/);
}
