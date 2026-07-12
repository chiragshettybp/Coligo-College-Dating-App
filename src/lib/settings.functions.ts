// ============================================================================
// Settings module server functions — authenticated, RLS-scoped to the current
// user. Covers the Settings control center: account info, privacy settings,
// security info, blocked-user management and a lightweight dashboard overview.
//
// Privacy lives on the existing per-user `settings` row (seeded by
// handle_new_user). Writing profile_visible / discovery_enabled immediately
// affects Discovery (discover_candidates already filters on both).
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "profile-photos";
const SIGNED_TTL = 60 * 60; // 1h

type SB = SupabaseClient<Database>;

async function signPath(supabase: SB, path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

// ============================================================ Account info
export type AccountInfo = {
  id: string;
  phone: string | null;
  verificationStatus: string;
  collegeName: string | null;
  memberSince: string;
  lastLoginAt: string | null;
};

export const getAccountInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountInfo | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, phone, verification_status, created_at, last_login_at, colleges:college_id(name)")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const college = (data as unknown as { colleges: { name: string } | null }).colleges;
    return {
      id: data.id,
      phone: data.phone,
      verificationStatus: data.verification_status ?? "unverified",
      collegeName: college?.name ?? null,
      memberSince: data.created_at,
      lastLoginAt: data.last_login_at,
    };
  });

export const accountInfoQuery = () =>
  queryOptions({
    queryKey: ["settings", "account"],
    queryFn: () => getAccountInfo(),
    staleTime: 30_000,
  });

// ============================================================ Privacy
export type PrivacySettings = {
  profileVisible: boolean;
  discoveryEnabled: boolean;
  showOnlineStatus: boolean;
  allowProfilePreview: boolean;
};

export const getPrivacySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PrivacySettings> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("settings")
      .select("profile_visible, discovery_enabled, show_online_status, allow_profile_preview")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      profileVisible: data?.profile_visible ?? true,
      discoveryEnabled: data?.discovery_enabled ?? true,
      showOnlineStatus: data?.show_online_status ?? true,
      allowProfilePreview: data?.allow_profile_preview ?? true,
    };
  });

export const privacySettingsQuery = () =>
  queryOptions({
    queryKey: ["settings", "privacy"],
    queryFn: () => getPrivacySettings(),
    staleTime: 30_000,
  });

const privacyPatchSchema = z.object({
  profile_visible: z.boolean().optional(),
  discovery_enabled: z.boolean().optional(),
  show_online_status: z.boolean().optional(),
  allow_profile_preview: z.boolean().optional(),
});

export const updatePrivacySetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => privacyPatchSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const patch: Record<string, boolean> = {};
    if (data.profile_visible !== undefined) patch.profile_visible = data.profile_visible;
    if (data.discovery_enabled !== undefined) patch.discovery_enabled = data.discovery_enabled;
    if (data.show_online_status !== undefined) patch.show_online_status = data.show_online_status;
    if (data.allow_profile_preview !== undefined) patch.allow_profile_preview = data.allow_profile_preview;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================ Security
export type SecurityInfo = {
  verificationStatus: string;
  lastLoginAt: string | null;
  currentSession: { platform: string; lastSeenAt: string } | null;
};

export const getSecurityInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecurityInfo> => {
    const { supabase, userId } = context;
    const [profileRes, sessionRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("verification_status, last_login_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("device_sessions")
        .select("platform, last_seen_at")
        .eq("user_id", userId)
        .eq("revoked", false)
        .order("last_seen_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (profileRes.error) throw new Error(profileRes.error.message);
    return {
      verificationStatus: profileRes.data?.verification_status ?? "unverified",
      lastLoginAt: profileRes.data?.last_login_at ?? null,
      currentSession: sessionRes.data
        ? { platform: sessionRes.data.platform ?? "web", lastSeenAt: sessionRes.data.last_seen_at }
        : null,
    };
  });

export const securityInfoQuery = () =>
  queryOptions({
    queryKey: ["settings", "security"],
    queryFn: () => getSecurityInfo(),
    staleTime: 30_000,
  });

// ============================================================ Blocked users
export type BlockedUser = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  collegeName: string | null;
  blockedAt: string;
};

export const listBlockedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BlockedUser[]> => {
    const { supabase, userId } = context;
    const { data: blocks, error } = await supabase
      .from("blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = blocks ?? [];
    if (rows.length === 0) return [];

    const ids = rows.map((b) => b.blocked_id);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, colleges:college_id(name)")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);

    const byId = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          fullName: p.full_name as string | null,
          avatarUrl: p.avatar_url as string | null,
          collegeName:
            (p as unknown as { colleges: { name: string } | null }).colleges?.name ?? null,
        },
      ]),
    );

    return Promise.all(
      rows.map(async (b) => {
        const prof = byId.get(b.blocked_id);
        return {
          userId: b.blocked_id,
          fullName: prof?.fullName ?? null,
          avatarUrl: await signPath(supabase, prof?.avatarUrl ?? null),
          collegeName: prof?.collegeName ?? null,
          blockedAt: b.created_at,
        };
      }),
    );
  });

export const blockedUsersQuery = () =>
  queryOptions({
    queryKey: ["settings", "blocked-users"],
    queryFn: () => listBlockedUsers(),
    staleTime: 15_000,
  });

export const getBlockedUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<BlockedUser | null> => {
    const { supabase, userId } = context;
    const { data: block, error } = await supabase
      .from("blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", userId)
      .eq("blocked_id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!block) return null;
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, colleges:college_id(name)")
      .eq("id", data.userId)
      .maybeSingle();
    return {
      userId: block.blocked_id,
      fullName: (prof?.full_name as string | null) ?? null,
      avatarUrl: await signPath(supabase, (prof?.avatar_url as string | null) ?? null),
      collegeName:
        (prof as unknown as { colleges: { name: string } | null } | null)?.colleges?.name ?? null,
      blockedAt: block.created_at,
    };
  });

export const blockedUserQuery = (targetId: string) =>
  queryOptions({
    queryKey: ["settings", "blocked-user", targetId],
    queryFn: () => getBlockedUser({ data: { userId: targetId } }),
    staleTime: 15_000,
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", userId)
      .eq("blocked_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================ Overview
export type SettingsOverview = {
  blockedCount: number;
  discoveryEnabled: boolean;
  profileVisible: boolean;
};

export const getSettingsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SettingsOverview> => {
    const { supabase, userId } = context;
    const [blockRes, settingsRes] = await Promise.all([
      supabase
        .from("blocks")
        .select("id", { count: "exact", head: true })
        .eq("blocker_id", userId),
      supabase
        .from("settings")
        .select("discovery_enabled, profile_visible")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    return {
      blockedCount: blockRes.count ?? 0,
      discoveryEnabled: settingsRes.data?.discovery_enabled ?? true,
      profileVisible: settingsRes.data?.profile_visible ?? true,
    };
  });

export const settingsOverviewQuery = () =>
  queryOptions({
    queryKey: ["settings", "overview"],
    queryFn: () => getSettingsOverview(),
    staleTime: 15_000,
  });
