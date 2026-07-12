// ============================================================================
// Admin user-management server functions. Thin wrappers over admin-gated RPCs.
// Every RPC re-checks has_role(auth.uid(),'admin') server-side and raises
// 'Forbidden' otherwise, so a bypassed UI still cannot read or mutate data.
// Keep this module import-only + createServerFn declarations (server-fn split).
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signAdminPaths, resolveAdminUrl } from "@/lib/admin-users.server";

// ------------------------------------------------------------------- types
export type AdminUserRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar: string | null;
  gender: string | null;
  age: number | null;
  college_name: string | null;
  department_name: string | null;
  semester: number | null;
  graduation_year: number | null;
  created_at: string;
  last_login_at: string | null;
  account_status: string;
  verification_status: string;
  discovery: boolean;
  online: boolean;
  profile_completion: number;
  matches_count: number;
  chats_count: number;
  reports_received: number;
  device_count: number;
  total_count: number;
};

export type AdminUserFilters = {
  status?: string;
  verification?: string;
  gender?: string;
  college_id?: string;
  department_id?: string;
  semester?: number;
  graduation_year?: number;
  online?: boolean;
  discovery?: boolean;
  reported?: boolean;
  never_logged_in?: boolean;
};

export type AdminUserSort =
  | "newest"
  | "oldest"
  | "name"
  | "last_login"
  | "most_matches"
  | "most_messages"
  | "most_reports"
  | "profile_completion";

export type AdminUserDetail = {
  id: string;
  fullName: string | null;
  displayName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  age: number | null;
  lookingFor: string | null;
  collegeName: string | null;
  departmentName: string | null;
  semester: number | null;
  graduationYear: number | null;
  accountStatus: string;
  verificationStatus: string;
  onboardingCompleted: boolean;
  onboardingStep: number | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  online: boolean;
  discoveryEnabled: boolean;
  profileVisible: boolean;
  showOnlineStatus: boolean;
  deviceCount: number;
  photos: { id: string; path: string; isPrimary: boolean; position: number; createdAt: string }[];
  interests: string[];
};

export type AdminUserStats = {
  totalSwipes: number;
  likesGiven: number;
  likesReceived: number;
  passes: number;
  matches: number;
  unmatches: number;
  messagesSent: number;
  mediaUploaded: number;
  reportsReceived: number;
  reportsSubmitted: number;
  blocksMade: number;
  blocksReceived: number;
  notifications: number;
};

export type AdminUserMatch = {
  matchId: string;
  status: string;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  other: { id: string; fullName: string | null; avatar: string | null };
};

export type AdminUserReports = {
  against: { id: string; reason: string; details: string | null; status: string; createdAt: string; reporter: string | null }[];
  submitted: { id: string; reason: string; details: string | null; status: string; createdAt: string; reported: string | null }[];
};

export type AdminUserDevice = {
  id: string;
  platform: string | null;
  lastSeenAt: string;
  revoked: boolean;
  createdAt: string;
};

export type AdminTimelineEvent = { type: string; title: string; ts: string };

// --------------------------------------------------------------- validators
const filtersSchema = z
  .object({
    status: z.string().optional(),
    verification: z.string().optional(),
    gender: z.string().optional(),
    college_id: z.string().optional(),
    department_id: z.string().optional(),
    semester: z.number().optional(),
    graduation_year: z.number().optional(),
    online: z.boolean().optional(),
    discovery: z.boolean().optional(),
    reported: z.boolean().optional(),
    never_logged_in: z.boolean().optional(),
  })
  .partial();

const listInput = z.object({
  search: z.string().max(80).optional().default(""),
  filters: filtersSchema.optional().default({}),
  sort: z
    .enum(["newest", "oldest", "name", "last_login", "most_matches", "most_messages", "most_reports", "profile_completion"])
    .optional()
    .default("newest"),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
});

const uuidInput = z.object({ userId: z.string().uuid() });

// -------------------------------------------------------------------- reads
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }): Promise<{ rows: AdminUserRow[]; total: number }> => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_users", {
      _search: data.search,
      _filters: data.filters as never,
      _sort: data.sort,
      _limit: data.limit,
      _offset: data.offset,
    });
    if (error) throw new Error(error.message);
    const list = (rows as unknown as AdminUserRow[]) ?? [];
    const signed = await signAdminPaths(context.supabase, list.map((r) => r.avatar));
    const withAvatars = list.map((r) => ({ ...r, avatar: resolveAdminUrl(r.avatar, signed) }));
    return { rows: withAvatars, total: withAvatars.length > 0 ? Number(withAvatars[0].total_count) : 0 };
  });

export const getAdminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminUserDetail | null> => {
    const { data: res, error } = await context.supabase.rpc("admin_user_detail", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    if (res && (res as Record<string, unknown>).error) throw new Error("Forbidden");
    return (res as unknown as AdminUserDetail) ?? null;
  });

export const getAdminUserStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminUserStats> => {
    const { data: res, error } = await context.supabase.rpc("admin_user_stats", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return res as unknown as AdminUserStats;
  });

export const getAdminUserMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminUserMatch[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_user_matches", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return (res as unknown as AdminUserMatch[]) ?? [];
  });

export const getAdminUserReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminUserReports> => {
    const { data: res, error } = await context.supabase.rpc("admin_user_reports", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return res as unknown as AdminUserReports;
  });

export const getAdminUserDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminUserDevice[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_user_devices", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return (res as unknown as AdminUserDevice[]) ?? [];
  });

export const getAdminUserTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminTimelineEvent[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_user_timeline", { _user_id: data.userId, _limit: 40 });
    if (error) throw new Error(error.message);
    return (res as unknown as AdminTimelineEvent[]) ?? [];
  });

// --------------------------------------------------------------- moderation
const statusInput = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended", "banned", "deleted"]),
  reason: z.string().max(500).optional(),
});

export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statusInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; from: string; to: string }> => {
    const { data: res, error } = await context.supabase.rpc("admin_set_account_status", {
      _user_id: data.userId,
      _status: data.status,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; from: string; to: string };
  });

const verificationInput = z.object({
  userId: z.string().uuid(),
  status: z.enum(["verified", "unverified", "pending"]),
});

export const setVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => verificationInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_set_verification", {
      _user_id: data.userId,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const resetDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_reset_discovery", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const forceLogout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; sessionsRevoked: number }> => {
    const { data: res, error } = await context.supabase.rpc("admin_force_logout", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; sessionsRevoked: number };
  });

export const clearReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuidInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; resolved: number }> => {
    const { data: res, error } = await context.supabase.rpc("admin_clear_reports", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; resolved: number };
  });

// ------------------------------------------------------------- query options
export const adminUsersQuery = (params: z.input<typeof listInput>) =>
  queryOptions({
    queryKey: ["admin", "users", params],
    queryFn: () => listAdminUsers({ data: params }),
  });

export const adminUserDetailQuery = (userId: string) =>
  queryOptions({ queryKey: ["admin", "user", userId, "detail"], queryFn: () => getAdminUserDetail({ data: { userId } }) });
export const adminUserStatsQuery = (userId: string) =>
  queryOptions({ queryKey: ["admin", "user", userId, "stats"], queryFn: () => getAdminUserStats({ data: { userId } }) });
export const adminUserMatchesQuery = (userId: string) =>
  queryOptions({ queryKey: ["admin", "user", userId, "matches"], queryFn: () => getAdminUserMatches({ data: { userId } }) });
export const adminUserReportsQuery = (userId: string) =>
  queryOptions({ queryKey: ["admin", "user", userId, "reports"], queryFn: () => getAdminUserReports({ data: { userId } }) });
export const adminUserDevicesQuery = (userId: string) =>
  queryOptions({ queryKey: ["admin", "user", userId, "devices"], queryFn: () => getAdminUserDevices({ data: { userId } }) });
export const adminUserTimelineQuery = (userId: string) =>
  queryOptions({ queryKey: ["admin", "user", userId, "timeline"], queryFn: () => getAdminUserTimeline({ data: { userId } }) });
