// ============================================================================
// Admin Analytics module — server functions. Thin, admin-gated wrappers over the
// admin_analytics_* SQL RPCs. Every RPC re-checks has_role(auth.uid(),'admin')
// and raises 'Forbidden', so students can never read analytics even if the UI
// is bypassed. All aggregation runs server-side against real Supabase data.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------------------------------------------------------------------- types
export type AnalyticsKpis = {
  totalUsers: number;
  verifiedUsers: number;
  activeUsers: number;
  usersOnline: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  newInRange: number;
  totalColleges: number;
  totalDepartments: number;
  totalSwipes: number;
  totalLikes: number;
  totalPasses: number;
  totalMatches: number;
  matchRate: number;
  messages: number;
  imagesShared: number;
  voiceNotes: number;
  reports: number;
  reportsPending: number;
  bannedUsers: number;
  suspendedUsers: number;
  deletedUsers: number;
  activeConversations: number;
  dau: number;
  wau: number;
  mau: number;
  avgProfileCompletion: number;
};

export type SeriesPoint = { bucket: string; value: number };
export type NamedValue = { name: string; value: number };
export type HeatCell = { dow: number; hour: number; value: number };
export type ModerationInsights = {
  totalReports: number;
  byCategory: NamedValue[];
  byStatus: NamedValue[];
  avgResolutionHours: number;
  suspensions: number;
  bans: number;
  warnings: number;
  repeatOffenders: NamedValue[];
};

export type AnalyticsFilters = {
  start: string; // ISO
  end: string; // ISO
  college?: string;
  department?: string;
  gender?: string;
  verification?: string;
};

// ------------------------------------------------------------- validators
const rangeSchema = z.object({
  start: z.string(),
  end: z.string(),
  college: z.string().uuid().optional(),
  department: z.string().uuid().optional(),
  gender: z.string().optional(),
  verification: z.string().optional(),
});

function normalizeRange(d: z.infer<typeof rangeSchema>) {
  let start = new Date(d.start);
  let end = new Date(d.end);
  if (Number.isNaN(start.getTime())) start = new Date(Date.now() - 30 * 864e5);
  if (Number.isNaN(end.getTime())) end = new Date();
  if (start > end) [start, end] = [end, start];
  // Clamp to a sane maximum span (2 years) to protect aggregation queries.
  const MAX = 731 * 864e5;
  if (end.getTime() - start.getTime() > MAX) start = new Date(end.getTime() - MAX);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ----------------------------------------------------------------- KPIs
export const getAnalyticsKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }): Promise<AnalyticsKpis> => {
    const { start, end } = normalizeRange(data);
    const { data: res, error } = await context.supabase.rpc("admin_analytics_kpis", {
      p_start: start,
      p_end: end,
      p_college: data.college ?? undefined,
      p_department: data.department ?? undefined,
      p_gender: data.gender ?? undefined,
      p_verification: data.verification ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as AnalyticsKpis;
  });

// ------------------------------------------------------------- timeseries
const timeseriesSchema = rangeSchema.extend({
  metric: z.string(),
  bucket: z.enum(["day", "hour"]).optional(),
});

export const getAnalyticsTimeseries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => timeseriesSchema.parse(d))
  .handler(async ({ data, context }): Promise<SeriesPoint[]> => {
    const { start, end } = normalizeRange(data);
    const { data: res, error } = await context.supabase.rpc("admin_analytics_timeseries", {
      p_metric: data.metric,
      p_start: start,
      p_end: end,
      p_bucket: data.bucket ?? "day",
      p_college: data.college ?? undefined,
    });
    if (error) throw new Error(error.message);
    return (res as unknown as SeriesPoint[]) ?? [];
  });

// ----------------------------------------------------------- distribution
const distributionSchema = z.object({
  dimension: z.string(),
  college: z.string().uuid().optional(),
  department: z.string().uuid().optional(),
});

export const getAnalyticsDistribution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => distributionSchema.parse(d))
  .handler(async ({ data, context }): Promise<NamedValue[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_analytics_distribution", {
      p_dimension: data.dimension,
      p_college: data.college ?? undefined,
      p_department: data.department ?? undefined,
    });
    if (error) throw new Error(error.message);
    return (res as unknown as NamedValue[]) ?? [];
  });

// ------------------------------------------------------------ leaderboard
const leaderboardSchema = z.object({ kind: z.string(), limit: z.number().int().optional() });

export const getAnalyticsLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leaderboardSchema.parse(d))
  .handler(async ({ data, context }): Promise<NamedValue[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_analytics_leaderboard", {
      p_kind: data.kind,
      p_limit: data.limit ?? 10,
    });
    if (error) throw new Error(error.message);
    return (res as unknown as NamedValue[]) ?? [];
  });

// --------------------------------------------------------------- heatmap
const heatmapSchema = rangeSchema.extend({ metric: z.string() });

export const getAnalyticsHeatmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => heatmapSchema.parse(d))
  .handler(async ({ data, context }): Promise<HeatCell[]> => {
    const { start, end } = normalizeRange(data);
    const { data: res, error } = await context.supabase.rpc("admin_analytics_heatmap", {
      p_metric: data.metric,
      p_start: start,
      p_end: end,
    });
    if (error) throw new Error(error.message);
    return (res as unknown as HeatCell[]) ?? [];
  });

// ------------------------------------------------------------ moderation
export const getAnalyticsModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.pick({ start: true, end: true }).parse(d))
  .handler(async ({ data, context }): Promise<ModerationInsights> => {
    const { start, end } = normalizeRange({ ...data } as z.infer<typeof rangeSchema>);
    const { data: res, error } = await context.supabase.rpc("admin_analytics_moderation", {
      p_start: start,
      p_end: end,
    });
    if (error) throw new Error(error.message);
    return res as unknown as ModerationInsights;
  });

// ------------------------------------------------------------- query keys
const K = ["admin", "analytics"] as const;

export const analyticsKpisQuery = (f: AnalyticsFilters) =>
  queryOptions({ queryKey: [...K, "kpis", f], queryFn: () => getAnalyticsKpis({ data: f }) });

export const analyticsTimeseriesQuery = (f: AnalyticsFilters, metric: string, bucket: "day" | "hour" = "day") =>
  queryOptions({
    queryKey: [...K, "ts", metric, bucket, f],
    queryFn: () => getAnalyticsTimeseries({ data: { ...f, metric, bucket } }),
  });

export const analyticsDistributionQuery = (dimension: string, college?: string, department?: string) =>
  queryOptions({
    queryKey: [...K, "dist", dimension, college ?? "", department ?? ""],
    queryFn: () => getAnalyticsDistribution({ data: { dimension, college, department } }),
  });

export const analyticsLeaderboardQuery = (kind: string, limit = 10) =>
  queryOptions({ queryKey: [...K, "lb", kind, limit], queryFn: () => getAnalyticsLeaderboard({ data: { kind, limit } }) });

export const analyticsHeatmapQuery = (f: AnalyticsFilters, metric: string) =>
  queryOptions({ queryKey: [...K, "heat", metric, f], queryFn: () => getAnalyticsHeatmap({ data: { ...f, metric } }) });

export const analyticsModerationQuery = (start: string, end: string) =>
  queryOptions({ queryKey: [...K, "mod", start, end], queryFn: () => getAnalyticsModeration({ data: { start, end } }) });
