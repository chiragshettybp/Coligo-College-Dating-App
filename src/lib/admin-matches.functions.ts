// ============================================================================
// Admin Match Management server functions. Thin wrappers over admin-gated RPCs
// — every RPC re-checks has_role(auth.uid(),'admin') and raises 'Forbidden'
// otherwise, so a bypassed UI still cannot read or mutate match data.
// Keep this module import-only + createServerFn declarations (server-fn split).
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signAdminPaths, resolveAdminUrl } from "@/lib/admin-users.server";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

// ------------------------------------------------------------------- types
export type MatchStatus = "active" | "archived" | "unmatched" | "deleted";

export type MatchSort =
  | "newest"
  | "oldest"
  | "most_messages"
  | "least_messages"
  | "most_reports"
  | "least_reports"
  | "longest_active"
  | "shortest_active"
  | "match_duration"
  | "last_activity";

export type AdminMatchRow = {
  id: string;
  user_a: string | null;
  user_b: string | null;
  user_a_name: string | null;
  user_b_name: string | null;
  user_a_avatar: string | null;
  user_b_avatar: string | null;
  college_a: string | null;
  college_b: string | null;
  dept_a: string | null;
  dept_b: string | null;
  created_at: string;
  first_message_at: string | null;
  last_activity: string | null;
  total_messages: number;
  media_count: number;
  status: MatchStatus;
  conversation_status: string;
  reports_count: number;
  flagged: boolean;
  suspicious: boolean;
  investigation_status: string;
  match_duration_secs: number;
  total_count: number;
};

export type AdminMatchFilters = {
  status?: string;
  department_id?: string;
  college?: string; // 'same' | 'different'
  activity?: string; // 'none' | 'has' | 'high' | 'low'
  flagged?: boolean;
  suspicious?: boolean;
  reported?: boolean;
  has_media?: boolean;
  date_from?: string;
  date_to?: string;
};

export type MatchStats = {
  total: number;
  active: number;
  archived: number;
  unmatched: number;
  today: number;
  week: number;
  month: number;
  withConversations: number;
  withoutMessages: number;
  totalMessages: number;
  avgDurationHours: number;
  avgTimeToFirstMsgMins: number;
  successRate: number;
  failureRate: number;
  suspicious: number;
  flagged: number;
  underInvestigation: number;
};

export type MatchParticipant = {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  college: string | null;
  department: string | null;
  semester: number | null;
  graduationYear: number | null;
  accountStatus: string | null;
  verificationStatus: string | null;
  onboardingCompleted: boolean | null;
};

export type MatchMessage = {
  id: string;
  sender_id: string | null;
  body: string | null;
  image_path: string | null;
  audio_path: string | null;
  created_at: string;
};

export type MatchReportRef = {
  id: string;
  reporterId: string | null;
  reportedId: string | null;
  reason: string | null;
  status: string | null;
  createdAt: string;
};

export type AdminMatchDetail = {
  id: string;
  status: MatchStatus;
  matchSource: string | null;
  createdAt: string;
  lastActivity: string | null;
  unmatchedAt: string | null;
  unmatchedBy: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  flagged: boolean;
  suspicious: boolean;
  investigationStatus: string;
  conversationDisabled: boolean;
  adminNote: string | null;
  firstLikeAt: string | null;
  mutualLikeAt: string | null;
  participantA: MatchParticipant | null;
  participantB: MatchParticipant | null;
  conversation: {
    total: number;
    text: number;
    images: number;
    voice: number;
    replies: number;
    read: number;
    firstAt: string | null;
    lastAt: string | null;
    startedBy: string | null;
  } | null;
  firstNote: { sender: string | null; timestamp: string; content: string | null } | null;
  recentMessages: MatchMessage[];
  reports: MatchReportRef[];
};

export type MatchAction = {
  id: string;
  action: string;
  reason: string | null;
  previousState: Record<string, Json>;
  newState: Record<string, Json>;
  adminName: string | null;
  createdAt: string;
};

export type MatchAnalytics = {
  byDay: { day: string; count: number }[];
  byCollege: { name: string; count: number }[];
  unmatchByDay: { day: string; count: number }[];
};

// --------------------------------------------------------------- validators
const filtersSchema = z
  .object({
    status: z.string().optional(),
    department_id: z.string().optional(),
    college: z.string().optional(),
    activity: z.string().optional(),
    flagged: z.boolean().optional(),
    suspicious: z.boolean().optional(),
    reported: z.boolean().optional(),
    has_media: z.boolean().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  })
  .partial();

const listInput = z.object({
  search: z.string().max(80).optional().default(""),
  filters: filtersSchema.optional().default({}),
  sort: z
    .enum([
      "newest",
      "oldest",
      "most_messages",
      "least_messages",
      "most_reports",
      "least_reports",
      "longest_active",
      "shortest_active",
      "match_duration",
      "last_activity",
    ])
    .optional()
    .default("newest"),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
});

const idInput = z.object({ matchId: z.string().uuid() });
const reasonInput = z.object({ matchId: z.string().uuid(), reason: z.string().max(500).optional() });
const toggleInput = z.object({ matchId: z.string().uuid(), value: z.boolean(), reason: z.string().max(500).optional() });

// -------------------------------------------------------------------- reads
export const getMatchStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchStats> => {
    const { data, error } = await context.supabase.rpc("admin_match_stats");
    if (error) throw new Error(error.message);
    return data as unknown as MatchStats;
  });

export const listAdminMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }): Promise<{ rows: AdminMatchRow[]; total: number }> => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_matches", {
      _search: data.search,
      _filters: data.filters as never,
      _sort: data.sort,
      _limit: data.limit,
      _offset: data.offset,
    });
    if (error) throw new Error(error.message);
    const list = (rows as unknown as AdminMatchRow[]) ?? [];
    const signed = await signAdminPaths(
      context.supabase,
      list.flatMap((r) => [r.user_a_avatar, r.user_b_avatar]),
    );
    const withAvatars = list.map((r) => ({
      ...r,
      user_a_avatar: resolveAdminUrl(r.user_a_avatar, signed),
      user_b_avatar: resolveAdminUrl(r.user_b_avatar, signed),
      total_messages: Number(r.total_messages),
      media_count: Number(r.media_count),
      reports_count: Number(r.reports_count),
      match_duration_secs: Number(r.match_duration_secs),
    }));
    return { rows: withAvatars, total: withAvatars.length > 0 ? Number(withAvatars[0].total_count) : 0 };
  });

export const getMatchDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminMatchDetail | null> => {
    const { data: res, error } = await context.supabase.rpc("admin_match_detail", { _match_id: data.matchId });
    if (error) throw new Error(error.message);
    if (!res) return null;
    const detail = res as unknown as AdminMatchDetail;
    const paths: (string | null | undefined)[] = [detail.participantA?.avatar, detail.participantB?.avatar];
    const signed = await signAdminPaths(context.supabase, paths);
    return {
      ...detail,
      participantA: detail.participantA
        ? { ...detail.participantA, avatar: resolveAdminUrl(detail.participantA.avatar, signed) }
        : null,
      participantB: detail.participantB
        ? { ...detail.participantB, avatar: resolveAdminUrl(detail.participantB.avatar, signed) }
        : null,
    };
  });

export const getMatchActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<MatchAction[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_match_actions", { _match_id: data.matchId });
    if (error) throw new Error(error.message);
    return (res as unknown as MatchAction[]) ?? [];
  });

export const getMatchAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchAnalytics> => {
    const { data, error } = await context.supabase.rpc("admin_match_analytics");
    if (error) throw new Error(error.message);
    return data as unknown as MatchAnalytics;
  });

// --------------------------------------------------------------- mutations
export const archiveMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reasonInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_archive_match", {
      _match_id: data.matchId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const restoreMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reasonInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_restore_match", {
      _match_id: data.matchId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const deleteMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reasonInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_delete_match", {
      _match_id: data.matchId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const forceUnmatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reasonInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_force_unmatch", {
      _match_id: data.matchId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const setConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_set_conversation", {
      _match_id: data.matchId,
      _disabled: data.value,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const flagMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_flag_match", {
      _match_id: data.matchId,
      _flagged: data.value,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const markSuspicious = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_mark_suspicious", {
      _match_id: data.matchId,
      _suspicious: data.value,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

// ------------------------------------------------------------- query options
export const matchStatsQuery = () =>
  queryOptions({ queryKey: ["admin", "matches", "stats"], queryFn: () => getMatchStats() });

export const adminMatchesQuery = (params: z.input<typeof listInput>) =>
  queryOptions({ queryKey: ["admin", "matches", "list", params], queryFn: () => listAdminMatches({ data: params }) });

export const matchAnalyticsQuery = () =>
  queryOptions({ queryKey: ["admin", "matches", "analytics"], queryFn: () => getMatchAnalytics() });

export const matchDetailQuery = (matchId: string) =>
  queryOptions({ queryKey: ["admin", "match", matchId], queryFn: () => getMatchDetail({ data: { matchId } }) });

export const matchActionsQuery = (matchId: string) =>
  queryOptions({ queryKey: ["admin", "match", matchId, "actions"], queryFn: () => getMatchActions({ data: { matchId } }) });
