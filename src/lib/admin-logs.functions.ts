// ============================================================================
// Admin Logs module — server functions. Thin, admin-gated wrappers over the
// admin_logs_* SQL RPCs backed by the read-only unified_logs view. Every RPC
// re-checks has_role(auth.uid(),'admin') and raises 'Forbidden', so students
// can never read audit data even if the UI is bypassed. All aggregation and
// pagination run server-side against real Supabase data; logs are append-only.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------------------------------------------------------------------- types
export type LogCategory =
  | "auth"
  | "user"
  | "admin"
  | "moderation"
  | "security"
  | "system"
  | "database"
  | "storage"
  | "api"
  | "realtime";

export type LogSeverity = "info" | "warning" | "error" | "critical";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type LogRow = {
  log_id: string;
  source: string;
  row_id: string;
  category: LogCategory;
  severity: LogSeverity;
  event: string;
  description: string | null;
  user_id: string | null;
  admin_id: string | null;
  ip: string | null;
  device: string | null;
  module: string | null;
  status: string | null;
  request_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata: Json | null;
  created_at: string;
  has_metadata?: boolean;
  user_name?: string | null;
  user_phone?: string | null;
  admin_name?: string | null;
  admin_phone?: string | null;
};

export type LogsPage = { total: number; page: number; pageSize: number; rows: LogRow[] };
export type LogsKpis = {
  total: number;
  today: number;
  errorsToday: number;
  critical: number;
  securityEvents: number;
  failedLogins: number;
  successfulLogins: number;
  adminActions: number;
  moderationActions: number;
  apiErrors: number;
  storageErrors: number;
  realtimeErrors: number;
  activeSessions: number;
  suspicious: number;
};
export type SeriesPoint = { bucket: string; value: number };
export type NamedValue = { name: string; value: number };

export type LogSort = "newest" | "oldest" | "severity_high" | "severity_low";

export type LogFilters = {
  start: string;
  end: string;
  q?: string;
  categories?: LogCategory[];
  severities?: LogSeverity[];
  status?: string;
  admin_id?: string;
  user_id?: string;
};

// ------------------------------------------------------------- validators
const filtersSchema = z.object({
  start: z.string(),
  end: z.string(),
  q: z.string().optional(),
  categories: z.array(z.string()).optional(),
  severities: z.array(z.string()).optional(),
  status: z.string().optional(),
  admin_id: z.string().optional(),
  user_id: z.string().optional(),
});

const listSchema = z.object({
  filters: filtersSchema,
  sort: z.string().optional(),
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

function normalizeRange(start: string, end: string) {
  let s = new Date(start);
  let e = new Date(end);
  if (Number.isNaN(s.getTime())) s = new Date(Date.now() - 30 * 864e5);
  if (Number.isNaN(e.getTime())) e = new Date();
  if (s > e) [s, e] = [e, s];
  const MAX = 731 * 864e5;
  if (e.getTime() - s.getTime() > MAX) s = new Date(e.getTime() - MAX);
  return { start: s.toISOString(), end: e.toISOString() };
}

// ------------------------------------------------------------------- LIST
export const listLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ data, context }): Promise<LogsPage> => {
    const { start, end } = normalizeRange(data.filters.start, data.filters.end);
    const { data: res, error } = await context.supabase.rpc("admin_logs_list", {
      p_filters: { ...data.filters, start, end } as never,
      p_sort: data.sort ?? "newest",
      p_page: data.page ?? 0,
      p_page_size: data.pageSize ?? 50,
    });
    if (error) throw new Error(error.message);
    return (res as unknown as LogsPage) ?? { total: 0, page: 0, pageSize: 50, rows: [] };
  });

// ------------------------------------------------------------------- KPIs
const rangeSchema = z.object({ start: z.string(), end: z.string() });

export const getLogsKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }): Promise<LogsKpis> => {
    const { start, end } = normalizeRange(data.start, data.end);
    const { data: res, error } = await context.supabase.rpc("admin_logs_kpis", {
      p_start: start,
      p_end: end,
    });
    if (error) throw new Error(error.message);
    return res as unknown as LogsKpis;
  });

// ------------------------------------------------------------- timeseries
const tsSchema = rangeSchema.extend({ metric: z.string(), bucket: z.enum(["day", "hour"]).optional() });

export const getLogsTimeseries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tsSchema.parse(d))
  .handler(async ({ data, context }): Promise<SeriesPoint[]> => {
    const { start, end } = normalizeRange(data.start, data.end);
    const { data: res, error } = await context.supabase.rpc("admin_logs_timeseries", {
      p_metric: data.metric,
      p_start: start,
      p_end: end,
      p_bucket: data.bucket ?? "day",
    });
    if (error) throw new Error(error.message);
    return (res as unknown as SeriesPoint[]) ?? [];
  });

// ----------------------------------------------------------- distribution
const distSchema = rangeSchema.extend({ dimension: z.string() });

export const getLogsDistribution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => distSchema.parse(d))
  .handler(async ({ data, context }): Promise<NamedValue[]> => {
    const { start, end } = normalizeRange(data.start, data.end);
    const { data: res, error } = await context.supabase.rpc("admin_logs_distribution", {
      p_dimension: data.dimension,
      p_start: start,
      p_end: end,
    });
    if (error) throw new Error(error.message);
    return (res as unknown as NamedValue[]) ?? [];
  });

// --------------------------------------------------------------- detail
const detailSchema = z.object({ source: z.string(), id: z.string().uuid() });

export const getLogDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => detailSchema.parse(d))
  .handler(async ({ data, context }): Promise<LogRow | null> => {
    const { data: res, error } = await context.supabase.rpc("admin_logs_detail", {
      p_source: data.source,
      p_id: data.id,
    });
    if (error) throw new Error(error.message);
    return (res as unknown as LogRow) ?? null;
  });

// ------------------------------------------------------------ investigation
const investigationSchema = z.object({ keyType: z.string(), keyValue: z.string() });

export const getLogInvestigation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => investigationSchema.parse(d))
  .handler(async ({ data, context }): Promise<LogRow[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_logs_investigation", {
      p_key_type: data.keyType,
      p_key_value: data.keyValue,
    });
    if (error) throw new Error(error.message);
    return (res as unknown as LogRow[]) ?? [];
  });

// ------------------------------------------------------------- query keys
const K = ["admin", "logs"] as const;

export const logsListQuery = (filters: LogFilters, sort: LogSort, page: number, pageSize: number) =>
  queryOptions({
    queryKey: [...K, "list", filters, sort, page, pageSize],
    queryFn: () => listLogs({ data: { filters, sort, page, pageSize } }),
  });

export const logsKpisQuery = (start: string, end: string) =>
  queryOptions({ queryKey: [...K, "kpis", start, end], queryFn: () => getLogsKpis({ data: { start, end } }) });

export const logsTimeseriesQuery = (start: string, end: string, metric: string, bucket: "day" | "hour" = "day") =>
  queryOptions({
    queryKey: [...K, "ts", metric, bucket, start, end],
    queryFn: () => getLogsTimeseries({ data: { start, end, metric, bucket } }),
  });

export const logsDistributionQuery = (start: string, end: string, dimension: string) =>
  queryOptions({
    queryKey: [...K, "dist", dimension, start, end],
    queryFn: () => getLogsDistribution({ data: { start, end, dimension } }),
  });

export const logDetailQuery = (source: string, id: string, enabled: boolean) =>
  queryOptions({
    queryKey: [...K, "detail", source, id],
    queryFn: () => getLogDetail({ data: { source, id } }),
    enabled,
  });

export const logInvestigationQuery = (keyType: string, keyValue: string, enabled: boolean) =>
  queryOptions({
    queryKey: [...K, "investigate", keyType, keyValue],
    queryFn: () => getLogInvestigation({ data: { keyType, keyValue } }),
    enabled,
  });
