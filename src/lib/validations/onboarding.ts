import { z } from "zod";

function minAge(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

export const teenOnboardingSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  dateOfBirth: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date")
    .refine((v) => new Date(v) <= minAge(13), "You must be at least 13 years old")
    .refine((v) => new Date(v) > minAge(19), "This platform is for ages 13–18"),
  guardianEmail: z.email("Enter a valid guardian email address"),
  skills: z.array(z.string().min(1)).default([]),
  hobbies: z.array(z.string().min(1)).default([]),
  bio: z.string().max(600, "Keep your bio under 600 characters").optional(),
});

export type TeenOnboardingInput = z.infer<typeof teenOnboardingSchema>;

export const employerOnboardingSchema = z.object({
  accountType: z.enum(["employer", "business"]),
  displayName: z.string().min(2, "Enter a name your listings will show"),
  bio: z.string().max(600, "Keep your bio under 600 characters").optional(),
});

export type EmployerOnboardingInput = z.infer<typeof employerOnboardingSchema>;
