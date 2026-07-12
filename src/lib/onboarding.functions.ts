// ============================================================================
// Onboarding server functions.
// - Public readers (colleges / departments / interests) use the anon
//   publishable client (RLS applies as anon; only active rows are visible).
// - Authenticated writers use requireSupabaseAuth so every mutation is
//   RLS-scoped to the signed-in user and validated server-side with the same
//   Zod schemas the client uses.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  STEP_SCHEMAS,
  interestsSchema,
  maxAllowedIndex,
  nextStep,
  stepIndex,
  ONBOARDING_STEPS,
  LIMITS,
  type StepWithForm,
} from "@/lib/onboarding";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const BUCKET = "profile-photos";

// ============================================================ Reference lists
export type College = { id: string; name: string; city: string | null };
export type Department = { id: string; name: string };
export type Interest = { id: string; name: string; category: string | null };

export const listColleges = createServerFn({ method: "GET" }).handler(
  async (): Promise<College[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("colleges")
      .select("id, name, city")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

export const collegesQuery = () =>
  queryOptions({ queryKey: ["ref", "colleges"], queryFn: () => listColleges(), staleTime: 10 * 60_000 });

export const listDepartments = createServerFn({ method: "GET" }).handler(
  async (): Promise<Department[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

export const departmentsQuery = () =>
  queryOptions({ queryKey: ["ref", "departments"], queryFn: () => listDepartments(), staleTime: 10 * 60_000 });

export const listInterests = createServerFn({ method: "GET" }).handler(
  async (): Promise<Interest[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("interests")
      .select("id, name, category")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

export const interestsListQuery = () =>
  queryOptions({ queryKey: ["ref", "interests"], queryFn: () => listInterests(), staleTime: 10 * 60_000 });

// ============================================================ Onboarding state
export type OnboardingPhoto = {
  id: string;
  storagePath: string;
  url: string | null;
  position: number;
  isPrimary: boolean;
};

export type OnboardingState = {
  onboardingCompleted: boolean;
  onboardingStep: string;
  fullName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  collegeId: string | null;
  graduationYear: number | null;
  semester: number | null;
  departmentId: string | null;
  lookingFor: string | null;
  bio: string | null;
  interestIds: string[];
  photos: OnboardingPhoto[];
};

async function signPhotos(
  supabase: ReturnType<typeof createClient<Database>>,
  rows: { id: string; storage_path: string; position: number; is_primary: boolean }[],
): Promise<OnboardingPhoto[]> {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  const out: OnboardingPhoto[] = [];
  for (const r of sorted) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 3600);
    out.push({
      id: r.id,
      storagePath: r.storage_path,
      url: data?.signedUrl ?? null,
      position: r.position,
      isPrimary: r.is_primary,
    });
  }
  return out;
}

export const getOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OnboardingState> => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select(
        "onboarding_completed, onboarding_step, full_name, gender, date_of_birth, college_id, graduation_year, semester, department_id, looking_for, bio",
      )
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    const { data: interests, error: iErr } = await supabase
      .from("user_interests")
      .select("interest_id")
      .eq("user_id", userId);
    if (iErr) throw new Error(iErr.message);

    const { data: photoRows, error: phErr } = await supabase
      .from("photos")
      .select("id, storage_path, position, is_primary")
      .eq("user_id", userId);
    if (phErr) throw new Error(phErr.message);

    const photos = await signPhotos(supabase, photoRows ?? []);

    return {
      onboardingCompleted: profile?.onboarding_completed ?? false,
      onboardingStep: profile?.onboarding_step ?? "name",
      fullName: profile?.full_name ?? null,
      gender: profile?.gender ?? null,
      dateOfBirth: profile?.date_of_birth ?? null,
      collegeId: profile?.college_id ?? null,
      graduationYear: profile?.graduation_year ?? null,
      semester: profile?.semester ?? null,
      departmentId: profile?.department_id ?? null,
      lookingFor: profile?.looking_for ?? null,
      bio: profile?.bio ?? null,
      interestIds: (interests ?? []).map((r) => r.interest_id),
      photos,
    };
  });

export const onboardingStateQuery = () =>
  queryOptions({
    queryKey: ["onboarding", "state"],
    queryFn: () => getOnboardingState(),
    staleTime: 0,
  });

// ============================================================ Save a step
const saveStepInput = z.object({
  step: z.enum(
    Object.keys(STEP_SCHEMAS) as [StepWithForm, ...StepWithForm[]],
  ),
  values: z.record(z.string(), z.unknown()),
});

export const saveOnboardingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveStepInput.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; onboardingStep: string }> => {
    const { supabase, userId } = context;
    const schema = STEP_SCHEMAS[data.step as StepWithForm];
    const parsed = schema.parse(data.values);

    // Advance the saved step forward only (edits to earlier steps never regress).
    const { data: current } = await supabase
      .from("profiles")
      .select("onboarding_step")
      .eq("id", userId)
      .maybeSingle();
    const currentIdx = maxAllowedIndex(current?.onboarding_step ?? "name");
    const targetIdx = stepIndex(nextStep(data.step as StepWithForm));
    const newStep = ONBOARDING_STEPS[Math.max(currentIdx, targetIdx)];

    const { error } = await supabase
      .from("profiles")
      .update({ ...parsed, onboarding_step: newStep })
      .eq("id", userId);
    if (error) throw new Error(error.message);

    return { ok: true, onboardingStep: newStep };
  });

// ============================================================ Interests
export const setInterests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ interestIds: interestsSchema }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; onboardingStep: string }> => {
    const { supabase, userId } = context;

    // Guard against forged interest ids: only accept active interests.
    const { data: valid, error: vErr } = await supabase
      .from("interests")
      .select("id")
      .in("id", data.interestIds)
      .eq("is_active", true);
    if (vErr) throw new Error(vErr.message);
    const validIds = (valid ?? []).map((r) => r.id);
    if (validIds.length < LIMITS.interestsMin) {
      throw new Error(`Pick at least ${LIMITS.interestsMin} valid interests.`);
    }

    const { error: delErr } = await supabase.from("user_interests").delete().eq("user_id", userId);
    if (delErr) throw new Error(delErr.message);

    const { error: insErr } = await supabase
      .from("user_interests")
      .insert(validIds.map((interest_id) => ({ user_id: userId, interest_id })));
    if (insErr) throw new Error(insErr.message);

    const newStep = "complete";
    await supabase.from("profiles").update({ onboarding_step: newStep }).eq("id", userId);
    return { ok: true, onboardingStep: newStep };
  });

// ============================================================ Photos
async function refreshPrimaryAndPositions(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
): Promise<void> {
  const { data: rows } = await supabase
    .from("photos")
    .select("id, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  const ordered = rows ?? [];
  for (let i = 0; i < ordered.length; i++) {
    await supabase
      .from("photos")
      .update({ position: i, is_primary: i === 0 })
      .eq("id", ordered[i].id);
  }
  const primary = ordered[0];
  if (primary) {
    const { data: prow } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("id", primary.id)
      .maybeSingle();
    await supabase.from("profiles").update({ avatar_url: prow?.storage_path ?? null }).eq("id", userId);
  } else {
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  }
}

export const savePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storagePath: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }): Promise<OnboardingPhoto> => {
    const { supabase, userId } = context;
    // Enforce the storage path belongs to the caller and enforce the max count.
    if (!data.storagePath.startsWith(`${userId}/`)) throw new Error("Invalid photo path.");

    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) >= LIMITS.photosMax) {
      throw new Error(`You can upload up to ${LIMITS.photosMax} photos.`);
    }

    const position = count ?? 0;
    const { data: row, error } = await supabase
      .from("photos")
      .insert({ user_id: userId, storage_path: data.storagePath, position, is_primary: position === 0 })
      .select("id, storage_path, position, is_primary")
      .single();
    if (error) throw new Error(error.message);

    await refreshPrimaryAndPositions(supabase, userId);
    const signed = await signPhotos(supabase, [row]);
    return signed[0];
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (row?.storage_path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path]);
    }
    const { error } = await supabase.from("photos").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    await refreshPrimaryAndPositions(supabase, userId);
    return { ok: true };
  });

export const reorderPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderedIds: z.array(z.string().uuid()) }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    for (let i = 0; i < data.orderedIds.length; i++) {
      await supabase
        .from("photos")
        .update({ position: i, is_primary: i === 0 })
        .eq("id", data.orderedIds[i])
        .eq("user_id", userId);
    }
    await refreshPrimaryAndPositions(supabase, userId);
    return { ok: true };
  });

// ============================================================ Complete
export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; alreadyComplete: boolean }> => {
    const { supabase, userId } = context;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "onboarding_completed, full_name, gender, date_of_birth, college_id, graduation_year, semester, department_id, looking_for",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Profile not found.");

    if (profile.onboarding_completed) return { ok: true, alreadyComplete: true };

    const missing: string[] = [];
    if (!profile.full_name) missing.push("name");
    if (!profile.gender) missing.push("gender");
    if (!profile.date_of_birth) missing.push("date of birth");
    if (!profile.college_id) missing.push("college");
    if (!profile.graduation_year) missing.push("graduation year");
    if (!profile.semester) missing.push("semester");
    if (!profile.department_id) missing.push("department");
    if (!profile.looking_for) missing.push("looking for");

    const { count: photoCount } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((photoCount ?? 0) < LIMITS.photosMin) missing.push(`${LIMITS.photosMin} photos`);

    const { count: interestCount } = await supabase
      .from("user_interests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((interestCount ?? 0) < LIMITS.interestsMin) missing.push(`${LIMITS.interestsMin} interests`);

    if (missing.length > 0) {
      throw new Error(`Please complete: ${missing.join(", ")}.`);
    }

    const { error: uErr } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true, onboarding_step: "complete" })
      .eq("id", userId);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, alreadyComplete: false };
  });
