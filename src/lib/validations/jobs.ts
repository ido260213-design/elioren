import { z } from "zod";

export const jobPostSchema = z
  .object({
    title: z.string().min(3, "Give the job a title"),
    category: z.string().min(1, "Pick a category"),
    locationText: z.string().min(2, "Where is this job located?"),
    payType: z.enum(["hourly", "fixed"]),
    payAmount: z.coerce.number().positive("Pay must be greater than 0"),
    ageMin: z.coerce.number().int().min(13).max(18),
    ageMax: z.coerce.number().int().min(13).max(18),
    workersNeeded: z.coerce.number().int().min(1).max(50),
    description: z.string().min(20, "Add at least a couple sentences describing the job"),
  })
  .refine((data) => data.ageMin <= data.ageMax, {
    message: "Minimum age can't be greater than maximum age",
    path: ["ageMin"],
  });

export type JobPostInput = z.infer<typeof jobPostSchema>;

export const JOB_CATEGORIES = [
  "Babysitting & Childcare",
  "Pet Care",
  "Yard Work & Outdoor",
  "Tutoring",
  "Retail & Food Service",
  "Tech Help",
  "Moving & Manual Labor",
  "Events & Hospitality",
  "Creative & Design",
  "Other",
] as const;
