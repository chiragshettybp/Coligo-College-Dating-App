// ============================================================================
// Onboarding — client-safe config, schemas & helpers (no server imports).
// Shared by the onboarding screens AND the server functions so validation and
// step ordering live in exactly one place.
// ============================================================================
import { z } from "zod";

// ---------------------------------------------------------------- Step order
export const ONBOARDING_STEPS = [
  "name",
  "gender",
  "date-of-birth",
  "college",
  "graduation-year",
  "semester",
  "department",
  "looking-for",
  "photos",
  "bio",
  "interests",
  "complete",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function nextStep(step: OnboardingStep): OnboardingStep {
  const i = stepIndex(step);
  return ONBOARDING_STEPS[Math.min(i + 1, TOTAL_STEPS - 1)];
}

export function prevStep(step: OnboardingStep): OnboardingStep {
  const i = stepIndex(step);
  return ONBOARDING_STEPS[Math.max(i - 1, 0)];
}

/** The furthest step a user is allowed to visit given their saved progress. */
export function maxAllowedIndex(savedStep: string): number {
  const i = ONBOARDING_STEPS.indexOf(savedStep as OnboardingStep);
  return i === -1 ? 0 : i;
}

// ---------------------------------------------------------------- Enums
export const GENDER_OPTIONS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "other", label: "Other" },
] as const;

export const LOOKING_FOR_OPTIONS = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "everyone", label: "Everyone" },
] as const;

// ---------------------------------------------------------------- Limits
export const LIMITS = {
  nameMin: 2,
  nameMax: 50,
  bioMax: 500,
  minAge: 18,
  maxAge: 100,
  photosMin: 2,
  photosMax: 6,
  interestsMin: 3,
  interestsMax: 10,
  photoMaxBytes: 8 * 1024 * 1024, // 8MB pre-compression
} as const;

// ---------------------------------------------------------------- Age helpers
export function ageFromDob(dob: string | Date): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Latest allowable birth date (turned minAge today), yyyy-mm-dd. */
export function maxDobString(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - LIMITS.minAge);
  return d.toISOString().slice(0, 10);
}

/** Earliest allowable birth date (maxAge), yyyy-mm-dd. */
export function minDobString(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - LIMITS.maxAge);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- Grad years
export function graduationYearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 6; y <= current + 8; y++) years.push(y);
  return years;
}

export const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// ---------------------------------------------------------------- Zod schemas
export const nameSchema = z
  .string()
  .trim()
  .min(LIMITS.nameMin, `Name must be at least ${LIMITS.nameMin} characters.`)
  .max(LIMITS.nameMax, `Name must be under ${LIMITS.nameMax} characters.`)
  .regex(/^[\p{L}][\p{L} .'-]*$/u, "Enter a valid name (letters, spaces, . ' - only).");

export const genderSchema = z.enum(["woman", "man", "nonbinary", "other"]);

export const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Select your date of birth.")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date.")
  .refine((v) => new Date(v) <= new Date(), "Date can't be in the future.")
  .refine((v) => ageFromDob(v) >= LIMITS.minAge, `You must be at least ${LIMITS.minAge}.`)
  .refine((v) => ageFromDob(v) <= LIMITS.maxAge, "Enter a valid date of birth.");

export const collegeIdSchema = z.string().uuid("Select your college.");
export const departmentIdSchema = z.string().uuid("Select your department.");

export const graduationYearSchema = z
  .number()
  .int()
  .refine((y) => graduationYearOptions().includes(y), "Select a valid graduation year.");

export const semesterSchema = z
  .number()
  .int()
  .min(1, "Select your semester.")
  .max(10, "Select a valid semester.");

export const lookingForSchema = z.enum(["women", "men", "everyone"]);

export const bioSchema = z
  .string()
  .trim()
  .max(LIMITS.bioMax, `Bio must be under ${LIMITS.bioMax} characters.`)
  .default("");

export const interestsSchema = z
  .array(z.string().uuid())
  .min(LIMITS.interestsMin, `Pick at least ${LIMITS.interestsMin} interests.`)
  .max(LIMITS.interestsMax, `Pick up to ${LIMITS.interestsMax} interests.`);

/** Per-step payload schema map used on client and server. */
export const STEP_SCHEMAS = {
  name: z.object({ full_name: nameSchema }),
  gender: z.object({ gender: genderSchema }),
  "date-of-birth": z.object({ date_of_birth: dobSchema }),
  college: z.object({ college_id: collegeIdSchema }),
  "graduation-year": z.object({ graduation_year: graduationYearSchema }),
  semester: z.object({ semester: semesterSchema }),
  department: z.object({ department_id: departmentIdSchema }),
  "looking-for": z.object({ looking_for: lookingForSchema }),
  bio: z.object({ bio: bioSchema }),
} as const;

export type StepWithForm = keyof typeof STEP_SCHEMAS;
