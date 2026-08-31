import { describe, expect, it } from "vitest";

import { signupSchema, loginSchema } from "../auth";

describe("signupSchema", () => {
  it("accepts a valid teen signup", () => {
    const result = signupSchema.safeParse({
      role: "teen",
      email: "teen@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      role: "teen",
      email: "teen@example.com",
      password: "password123",
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    const result = signupSchema.safeParse({
      role: "employer",
      email: "employer@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid role", () => {
    const result = signupSchema.safeParse({
      role: "admin",
      email: "admin@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });
});
