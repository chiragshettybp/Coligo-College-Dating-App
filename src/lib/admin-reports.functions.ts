// ============================================================================
// Admin Reports & Moderation server functions. Thin wrappers over admin-gated
// RPCs — every RPC re-checks has_role(auth.uid(),'admin') and raises 'Forbidden'
// otherwise, so a bypassed UI still cannot read or mutate moderation data.
// Keep this module import-only + createServerFn declarations (server-fn split).
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signAdminPaths, resolveAdminUrl } from "@/lib/admin-users.server";

// ------------------------------------------------------------------- types
export type ReportStatus =
  | "open"
  | "under_review"
  | "escalated"
  | "resolved"
  | "rejected"
  | "archived";

export type ReportPriority = "low" | "medium" | "high" | "critical";

export type ReportSort =
  | "newest"
  | "oldest"
  | "priority_high"
  | "priority_low"
  | "most_reported"
  | "longest_pending"
  | "recently_updated";

export type AdminReportRow = {
  id: string;
  reporter_id: string | null;
  reporter_name: string | null;
  reported_id: string | null;
  reported_name: string | null;
  reported_avatar: string | null;
  reason: string | null;
  category: string | null;
  priority: ReportPriority;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  assigned_name: string | null;
  college_name: string | null;
  source_module: string | null;
  action_taken: string | null;
  evidence_count: number;
  previous_reports: number;
  total_count: number;
};

export type AdminReportFilters = {
  status?: string;
  category?: string;
  priority?: string;
  college_id?: string;
  moderator?: string;
  repeat_offender?: boolean;
  date_from?: string;
  date_to?: string;
};

export type ReportStats = {
  total: number;
  open: number;
  underReview: number;
  awaitingAssignment: number;
  escalated: number;
  high: number;
  critical: number;
  resolvedToday: number;
  rejectedToday: number;
  avgResolutionHours: number;
  repeatOffenders: number;
  last24h: number;
  last7d: number;
};

export type ReportPerson = {
  id: string;
  name: string | null;
  avatar: string | null;
  bio?: string | null;
  college: string | null;
  accountStatus: string;
  verificationStatus?: string;
  createdAt: string;
  reportsSubmitted?: number;
  reportsReceived?: number;
  matches?: number;
  photos?: { id: string; path: string | null }[];
};

export type ReportEvidence = {
  id: string;
  kind: string;
  path: string | null;
  content: string | null;
  metadata: Record<string, Json>;
  createdAt: string;
};

export type AdminReportDetail = {
  id: string;
  reason: string | null;
  category: string | null;
  priority: ReportPriority;
  status: ReportStatus;
  sourceModule: string | null;
  resolution: string | null;
  actionTaken: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
  details: string | null;
  assignedTo: string | null;
  assignedName: string | null;
  reporter: ReportPerson | null;
  reported: ReportPerson | null;
  evidence: ReportEvidence[];
};

export type ModerationNote = {
  id: string;
  body: string;
  authorId: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModerationAction = {
  id: string;
  action: string;
  reason: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  adminName: string | null;
  metadata: Record<string, Json>;
  createdAt: string;
};

export type ReportAnalytics = {
  byDay: { day: string; count: number }[];
  byCategory: { name: string; count: number }[];
  byStatus: Record<string, number>;
  byCollege: { name: string; count: number }[];
  repeatOffenders: { id: string; name: string | null; count: number }[];
  avgResolutionHours: number;
};

// --------------------------------------------------------------- validators
const filtersSchema = z
  .object({
    status: z.string().optional(),
    category: z.string().optional(),
    priority: z.string().optional(),
    college_id: z.string().optional(),
    moderator: z.string().optional(),
    repeat_offender: z.boolean().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  })
  .partial();

const listInput = z.object({
  search: z.string().max(80).optional().default(""),
  filters: filtersSchema.optional().default({}),
  sort: z
    .enum(["newest", "oldest", "priority_high", "priority_low", "most_reported", "longest_pending", "recently_updated"])
    .optional()
    .default("newest"),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
});

const idInput = z.object({ reportId: z.string().uuid() });

// -------------------------------------------------------------------- reads
export const getReportStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReportStats> => {
    const { data, error } = await context.supabase.rpc("admin_report_stats");
    if (error) throw new Error(error.message);
    return data as unknown as ReportStats;
  });

export const listAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }): Promise<{ rows: AdminReportRow[]; total: number }> => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_reports", {
      _search: data.search,
      _filters: data.filters as never,
      _sort: data.sort,
      _limit: data.limit,
      _offset: data.offset,
    });
    if (error) throw new Error(error.message);
    const list = (rows as unknown as AdminReportRow[]) ?? [];
    const signed = await signAdminPaths(context.supabase, list.map((r) => r.reported_avatar));
    const withAvatars = list.map((r) => ({
      ...r,
      reported_avatar: resolveAdminUrl(r.reported_avatar, signed),
      evidence_count: Number(r.evidence_count),
      previous_reports: Number(r.previous_reports),
    }));
    return { rows: withAvatars, total: withAvatars.length > 0 ? Number(withAvatars[0].total_count) : 0 };
  });

export const getReportDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminReportDetail | null> => {
    const { data: res, error } = await context.supabase.rpc("admin_report_detail", { _report_id: data.reportId });
    if (error) throw new Error(error.message);
    if (!res) return null;
    const detail = res as unknown as AdminReportDetail;
    const paths: (string | null | undefined)[] = [
      detail.reporter?.avatar,
      detail.reported?.avatar,
      ...(detail.reported?.photos ?? []).map((p) => p.path),
      ...detail.evidence.map((e) => e.path),
    ];
    const signed = await signAdminPaths(context.supabase, paths);
    return {
      ...detail,
      reporter: detail.reporter ? { ...detail.reporter, avatar: resolveAdminUrl(detail.reporter.avatar, signed) } : null,
      reported: detail.reported
        ? {
            ...detail.reported,
            avatar: resolveAdminUrl(detail.reported.avatar, signed),
            photos: (detail.reported.photos ?? []).map((p) => ({ ...p, path: resolveAdminUrl(p.path, signed) })),
          }
        : null,
      evidence: detail.evidence.map((e) => ({ ...e, path: resolveAdminUrl(e.path, signed) })),
    };
  });

export const getReportNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<ModerationNote[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_report_notes", { _report_id: data.reportId });
    if (error) throw new Error(error.message);
    return (res as unknown as ModerationNote[]) ?? [];
  });

export const getReportActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<ModerationAction[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_report_actions", { _report_id: data.reportId });
    if (error) throw new Error(error.message);
    return (res as unknown as ModerationAction[]) ?? [];
  });

export const getReportAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReportAnalytics> => {
    const { data, error } = await context.supabase.rpc("admin_report_analytics");
    if (error) throw new Error(error.message);
    return data as unknown as ReportAnalytics;
  });

// --------------------------------------------------------------- mutations
const assignInput = z.object({ reportId: z.string().uuid(), moderatorId: z.string().uuid() });
export const assignReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assignInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_assign_report", {
      _report_id: data.reportId,
      _moderator_id: data.moderatorId,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

const priorityInput = z.object({ reportId: z.string().uuid(), priority: z.enum(["low", "medium", "high", "critical"]) });
export const setReportPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => priorityInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_set_report_priority", {
      _report_id: data.reportId,
      _priority: data.priority,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

const statusInput = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["open", "under_review", "escalated", "resolved", "rejected", "archived"]),
  reason: z.string().max(500).optional(),
});
export const setReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statusInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; from: string; to: string }> => {
    const { data: res, error } = await context.supabase.rpc("admin_set_report_status", {
      _report_id: data.reportId,
      _status: data.status,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; from: string; to: string };
  });

const noteInput = z.object({ reportId: z.string().uuid(), body: z.string().trim().min(1).max(2000) });
export const addModerationNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => noteInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; id: string }> => {
    const { data: res, error } = await context.supabase.rpc("admin_add_moderation_note", {
      _report_id: data.reportId,
      _body: data.body,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; id: string };
  });

const resolveInput = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["warn", "suspend", "ban", "remove_content", "no_action", "dismiss"]),
  resolution: z.string().trim().min(1).max(2000),
  targetStatus: z.enum(["resolved", "rejected", "archived"]).optional().default("resolved"),
});
export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resolveInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_resolve_report", {
      _report_id: data.reportId,
      _action: data.action,
      _resolution: data.resolution,
      _target_status: data.targetStatus,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

// ------------------------------------------------------------- query options
export const reportStatsQuery = () =>
  queryOptions({ queryKey: ["admin", "reports", "stats"], queryFn: () => getReportStats() });

export const adminReportsQuery = (params: z.input<typeof listInput>) =>
  queryOptions({ queryKey: ["admin", "reports", "list", params], queryFn: () => listAdminReports({ data: params }) });

export const reportAnalyticsQuery = () =>
  queryOptions({ queryKey: ["admin", "reports", "analytics"], queryFn: () => getReportAnalytics() });

export const reportDetailQuery = (reportId: string) =>
  queryOptions({ queryKey: ["admin", "report", reportId, "detail"], queryFn: () => getReportDetail({ data: { reportId } }) });
export const reportNotesQuery = (reportId: string) =>
  queryOptions({ queryKey: ["admin", "report", reportId, "notes"], queryFn: () => getReportNotes({ data: { reportId } }) });
export const reportActionsQuery = (reportId: string) =>
  queryOptions({ queryKey: ["admin", "report", reportId, "actions"], queryFn: () => getReportActions({ data: { reportId } }) });
