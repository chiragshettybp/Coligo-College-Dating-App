// ============================================================================
// Profile server functions — authenticated, RLS-scoped to the current user.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccountStatus = "active" | "suspended" | "deleted";

export type MyProfile = {
  id: string;
  phone: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  collegeId: string | null;
  verificationStatus: string;
  onboardingCompleted: boolean;
  accountStatus: AccountStatus;
  lastLoginAt: string | null;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfile | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, phone, display_name, avatar_url, college_id, verification_status, onboarding_completed, account_status, last_login_at",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id: data.id,
      phone: data.phone,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      verificationStatus: data.verification_status ?? "unverified",
      onboardingCompleted: data.onboarding_completed ?? false,
      accountStatus: (data.account_status ?? "active") as AccountStatus,
      lastLoginAt: data.last_login_at,
    };
  });

export const myProfileQuery = () =>
  queryOptions({
    queryKey: ["me", "profile"],
    queryFn: () => getMyProfile(),
    staleTime: 60_000,
  });

export const touchLastLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
