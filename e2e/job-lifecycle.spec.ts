import { test, expect, type Browser } from "@playwright/test";

import { signUp, completeTeenOnboarding, completeEmployerOnboarding, uniqueEmail } from "./helpers";

// Requires a real Supabase project (Auth included) reachable via .env.local — see
// README's "Testing" section.

async function newSignedInPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

test("post a job, apply, accept, complete, and rate", async ({ browser }) => {
  const jobTitle = `Dog walker ${Date.now()}`;

  const { context: employerContext, page: employerPage } = await newSignedInPage(browser);
  const { context: teenContext, page: teenPage } = await newSignedInPage(browser);

  await test.step("employer signs up, onboards, and posts a job", async () => {
    await signUp(employerPage, "employer", uniqueEmail("employer"));
    await completeEmployerOnboarding(employerPage, "Employer Co");

    await employerPage.getByRole("link", { name: /post a job/i }).first().click();
    await employerPage.getByLabel("Job title").fill(jobTitle);
    await employerPage.getByLabel("Location").fill("Austin, TX");
    await employerPage.getByLabel("Pay amount ($)").fill("15");
    await employerPage.getByLabel("Description").fill("Walk two friendly dogs after school on weekdays.");
    await employerPage.getByRole("button", { name: /post job/i }).click();
    await expect(employerPage.getByRole("heading", { name: jobTitle })).toBeVisible();
  });

  await test.step("teen signs up, onboards, finds the job, and applies", async () => {
    await signUp(teenPage, "teen", uniqueEmail("teen"));
    await completeTeenOnboarding(teenPage, "Applicant Teen");

    await teenPage.goto("/jobs");
    await teenPage.getByPlaceholder(/search jobs/i).fill(jobTitle);
    await teenPage.keyboard.press("Enter");
    await teenPage.getByRole("link", { name: jobTitle }).click();
    await teenPage.getByRole("button", { name: /apply now/i }).click();
    await expect(teenPage.getByRole("button", { name: /^applied$/i })).toBeVisible();
  });

  await test.step("employer accepts the application and marks the job filled", async () => {
    await employerPage.goto("/applications");
    // The status control is a Radix Select (a styled combobox, not a native <select>).
    await employerPage.getByRole("combobox").first().click();
    await employerPage.getByRole("option", { name: "Accepted" }).click();

    const job = employerPage.getByRole("link", { name: jobTitle });
    await job.click();
    await employerPage.getByRole("button", { name: /mark filled/i }).click();
  });

  await test.step("both sides can leave a rating once the job is filled", async () => {
    await teenPage.goto("/applications");
    await teenPage.getByRole("button", { name: /leave a rating/i }).click();
    await teenPage.getByRole("button", { name: /rate 5 stars/i }).click();
    await teenPage.getByRole("button", { name: /submit rating/i }).click();
    await expect(teenPage.getByText(/^rated$/i)).toBeVisible();

    await employerPage.goto("/applications");
    await employerPage.getByRole("button", { name: /leave a rating/i }).click();
    await employerPage.getByRole("button", { name: /rate 5 stars/i }).click();
    await employerPage.getByRole("button", { name: /submit rating/i }).click();
    await expect(employerPage.getByText(/^rated$/i)).toBeVisible();
  });

  await employerContext.close();
  await teenContext.close();
});
