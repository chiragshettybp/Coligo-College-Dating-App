// ============================================================================
// Profile module server functions — authenticated, RLS-scoped to the current
// user. Covers the full /profile experience: overview, gallery, interests,
// stats, completion, core edits, bio and matching preferences.
//
// Photo + interest mutations reuse the existing onboarding functions
// (savePhoto / deletePhoto / reorderPhotos / setInterests) which are already
// validated and RLS-scoped — this file adds only the read + edit surface the
// Profile module needs on top of that.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  nameSchema,
  bioSchema,
  collegeIdSchema,
  departmentIdSchema,
  graduationYearSchema,
  semesterSchema,
  lookingForSchema,
  dobSchema,
  ageFromDob,
} from "@/lib/onboarding";

const BUCKET = "profile-photos";
const SIGNED_TTL = 60 * 60; // 1h

type SB = SupabaseClient<Database>;

async function signPath(supabase: SB, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

// ============================================================ Full profile
export type FullProfile = {
  id: string;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  age: number | null;
  collegeId: string | null;
  collegeName: string | null;
  collegeCity: string | null;
  departmentId: string | null;
  departmentName: string | null;
  semester: number | null;
  graduationYear: number | null;
  lookingFor: string | null;
  verificationStatus: string;
  memberSince: string;
  lastLoginAt: string | null;
};

export const getFullProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FullProfile | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, display_name, avatar_url, bio, gender, date_of_birth, college_id, department_id, semester, graduation_year, looking_for, verification_status, created_at, last_login_at, colleges:college_id(name, city), departments:department_id(name)",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const college = (data as unknown as { colleges: { name: string; city: string | null } | null }).colleges;
    const department = (data as unknown as { departments: { name: string } | null }).departments;

    return {
      id: data.id,
      fullName: data.full_name,
      displayName: data.display_name,
      avatarUrl: await signPath(supabase, data.avatar_url),
      bio: data.bio,
      gender: data.gender,
      dateOfBirth: data.date_of_birth,
      age: data.date_of_birth ? ageFromDob(data.date_of_birth) : null,
      collegeId: data.college_id,
      collegeName: college?.name ?? null,
      collegeCity: college?.city ?? null,
      departmentId: data.department_id,
      departmentName: department?.name ?? null,
      semester: data.semester,
      graduationYear: data.graduation_year,
      lookingFor: data.looking_for,
      verificationStatus: data.verification_status ?? "unverified",
      memberSince: data.created_at,
      lastLoginAt: data.last_login_at,
    };
  });

export const fullProfileQuery = () =>
  queryOptions({
    queryKey: ["profile", "full"],
    queryFn: () => getFullProfile(),
    staleTime: 30_000,
  });

// ============================================================ Gallery
export type ProfilePhoto = {
  id: string;
  storagePath: string;
  url: string | null;
  position: number;
  isPrimary: boolean;
};

export const getProfileGallery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfilePhoto[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("photos")
      .select("id, storage_path, position, is_primary")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        storagePath: r.storage_path,
        url: await signPath(supabase, r.storage_path),
        position: r.position,
        isPrimary: r.is_primary,
      })),
    );
  });

export const profileGalleryQuery = () =>
  queryOptions({
    queryKey: ["profile", "gallery"],
    queryFn: () => getProfileGallery(),
    staleTime: 30_000,
  });

// ============================================================ Interests
export type ProfileInterest = { id: string; name: string; category: string | null };

export const getMyInterests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileInterest[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_interests")
      .select("interest_id, interests:interest_id(id, name, category)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as {
      interests: { id: string; name: string; category: string | null } | null;
    }[];
    return rows
      .map((r) => r.interests)
      .filter((i): i is ProfileInterest => i != null)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

export const myInterestsQuery = () =>
  queryOptions({
    queryKey: ["profile", "interests"],
    queryFn: () => getMyInterests(),
    staleTime: 30_000,
  });

// ============================================================ Stats
export type ProfileStats = {
  totalMatches: number;
  totalChats: number;
  memberSince: string | null;
};

export const getProfileStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileStats> => {
    const { supabase, userId } = context;

    const { count: matchCount } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    const { count: chatCount } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("last_message_at", "is", null)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    const { data: prof } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", userId)
      .maybeSingle();

    return {
      totalMatches: matchCount ?? 0,
      totalChats: chatCount ?? 0,
      memberSince: prof?.created_at ?? null,
    };
  });

export const profileStatsQuery = () =>
  queryOptions({
    queryKey: ["profile", "stats"],
    queryFn: () => getProfileStats(),
    staleTime: 30_000,
  });

// ============================================================ Completion
export type ProfileCompletion = { percent: number; missing: string[] };

export const getProfileCompletion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileCompletion> => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("bio, department_id, semester, graduation_year, looking_for")
      .eq("id", userId)
      .maybeSingle();
    const { count: photoCount } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const { count: interestCount } = await supabase
      .from("user_interests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const checks: { label: string; done: boolean }[] = [
      { label: "Add at least 2 photos", done: (photoCount ?? 0) >= 2 },
      { label: "Write a bio", done: !!prof?.bio && prof.bio.trim().length > 0 },
      { label: "Pick 3+ interests", done: (interestCount ?? 0) >= 3 },
      { label: "Set your department", done: prof?.department_id != null },
      { label: "Set your semester", done: prof?.semester != null },
      { label: "Set graduation year", done: prof?.graduation_year != null },
      { label: "Set who you're looking for", done: prof?.looking_for != null },
    ];
    const done = checks.filter((c) => c.done).length;
    return {
      percent: Math.round((done / checks.length) * 100),
      missing: checks.filter((c) => !c.done).map((c) => c.label),
    };
  });

export const profileCompletionQuery = () =>
  queryOptions({
    queryKey: ["profile", "completion"],
    queryFn: () => getProfileCompletion(),
    staleTime: 30_000,
  });

// ============================================================ Core edit
const coreSchema = z.object({
  full_name: nameSchema,
  college_id: collegeIdSchema,
  department_id: departmentIdSchema,
  graduation_year: graduationYearSchema,
  semester: semesterSchema,
  date_of_birth: dobSchema,
  looking_for: lookingForSchema,
});

export const updateCoreProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => coreSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;

    // Guard forged reference ids: only accept active college / department.
    const { data: college } = await supabase
      .from("colleges")
      .select("id")
      .eq("id", data.college_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!college) throw new Error("Select a valid college.");
    const { data: dept } = await supabase
      .from("departments")
      .select("id")
      .eq("id", data.department_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!dept) throw new Error("Select a valid department.");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        college_id: data.college_id,
        department_id: data.department_id,
        graduation_year: data.graduation_year,
        semester: data.semester,
        date_of_birth: data.date_of_birth,
        looking_for: data.looking_for,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================ Bio edit
export const updateBio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bio: bioSchema }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ bio: data.bio })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================ Preferences
export type ProfilePreferences = {
  lookingFor: string | null;
  discoveryEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
};

export const getPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfilePreferences> => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("looking_for")
      .eq("id", userId)
      .maybeSingle();
    const { data: settings } = await supabase
      .from("settings")
      .select("discovery_enabled, push_enabled, email_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      lookingFor: prof?.looking_for ?? null,
      discoveryEnabled: settings?.discovery_enabled ?? true,
      pushEnabled: settings?.push_enabled ?? true,
      emailEnabled: settings?.email_enabled ?? false,
    };
  });

export const preferencesQuery = () =>
  queryOptions({
    queryKey: ["profile", "preferences"],
    queryFn: () => getPreferences(),
    staleTime: 30_000,
  });

const prefsSchema = z.object({
  looking_for: lookingForSchema.optional(),
  discovery_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
});

export const updatePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => prefsSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;

    if (data.looking_for) {
      const { error } = await supabase
        .from("profiles")
        .update({ looking_for: data.looking_for })
        .eq("id", userId);
      if (error) throw new Error(error.message);
    }

    const settingsPatch: Record<string, boolean> = {};
    if (data.discovery_enabled !== undefined) settingsPatch.discovery_enabled = data.discovery_enabled;
    if (data.push_enabled !== undefined) settingsPatch.push_enabled = data.push_enabled;
    if (data.email_enabled !== undefined) settingsPatch.email_enabled = data.email_enabled;
    if (Object.keys(settingsPatch).length > 0) {
      const { error } = await supabase
        .from("settings")
        .upsert({ user_id: userId, ...settingsPatch }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
