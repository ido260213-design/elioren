import { describe, expect, it } from "vitest";

import { jobPostSchema } from "../jobs";

const validJob = {
  title: "Weekend dog walker",
  category: "Pet Care",
  locationText: "Austin, TX",
  payType: "hourly" as const,
  payAmount: "15",
  ageMin: "13",
  ageMax: "18",
  workersNeeded: "1",
  description: "Walk two friendly dogs after school on weekdays.",
};

describe("jobPostSchema", () => {
  it("accepts a valid job post and coerces numeric strings", () => {
    const result = jobPostSchema.safeParse(validJob);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payAmount).toBe(15);
      expect(result.data.ageMin).toBe(13);
    }
  });

  it("rejects ageMin greater than ageMax", () => {
    const result = jobPostSchema.safeParse({ ...validJob, ageMin: "18", ageMax: "13" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive pay amount", () => {
    const result = jobPostSchema.safeParse({ ...validJob, payAmount: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a description that's too short", () => {
    const result = jobPostSchema.safeParse({ ...validJob, description: "too short" });
    expect(result.success).toBe(false);
  });
});
