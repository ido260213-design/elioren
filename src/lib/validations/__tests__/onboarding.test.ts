import { describe, expect, it } from "vitest";

import { teenOnboardingSchema } from "../onboarding";

function isoDateYearsAgo(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

describe("teenOnboardingSchema", () => {
  it("accepts a 15-year-old", () => {
    const result = teenOnboardingSchema.safeParse({
      fullName: "Jamie Rivera",
      dateOfBirth: isoDateYearsAgo(15),
      guardianEmail: "guardian@example.com",
      skills: ["Babysitting"],
      hobbies: ["Soccer"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects someone under 13", () => {
    const result = teenOnboardingSchema.safeParse({
      fullName: "Too Young",
      dateOfBirth: isoDateYearsAgo(10),
      guardianEmail: "guardian@example.com",
      skills: [],
      hobbies: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects someone 19 or older", () => {
    const result = teenOnboardingSchema.safeParse({
      fullName: "Too Old",
      dateOfBirth: isoDateYearsAgo(20),
      guardianEmail: "guardian@example.com",
      skills: [],
      hobbies: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed guardian email", () => {
    const result = teenOnboardingSchema.safeParse({
      fullName: "Jamie Rivera",
      dateOfBirth: isoDateYearsAgo(15),
      guardianEmail: "not-an-email",
      skills: [],
      hobbies: [],
    });
    expect(result.success).toBe(false);
  });
});
