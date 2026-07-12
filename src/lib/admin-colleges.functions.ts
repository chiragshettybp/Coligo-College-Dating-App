// ============================================================================
// Admin college-management server functions. Thin wrappers over admin-gated
// RPCs. Every RPC re-checks has_role(auth.uid(),'admin') server-side and raises
// 'Forbidden' otherwise, so a bypassed UI still cannot read or mutate data.
// Keep this module import-only + createServerFn declarations (server-fn split).
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signAdminPaths, resolveAdminUrl } from "@/lib/admin-users.server";
import { signBucketPaths, resolveMediaUrl, LOGO_BUCKET, BANNER_BUCKET } from "@/lib/college-media.server";

// ------------------------------------------------------------------- types
export type CollegeSummary = {
  totalColleges: number;
  activeColleges: number;
  disabledColleges: number;
  archivedColleges: number;
  discoveryEnabled: number;
  totalStudents: number;
  studentsToday: number;
  collegesThisMonth: number;
  verificationPct: number;
  avgStudentsPerCollege: number;
  topGrowing: { id: string; name: string; growth: number }[];
};

export type CollegeStatus = "active" | "disabled" | "archived";

export type AdminCollegeRow = {
  id: string;
  name: string;
  code: string | null;
  short_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: CollegeStatus;
  discovery_enabled: boolean;
  created_at: string;
  updated_at: string;
  total_students: number;
  male_students: number;
  female_students: number;
  department_count: number;
  active_users: number;
  online_users: number;
  total_matches: number;
  messages_sent: number;
  profile_completion: number;
  growth_30d: number;
  total_count: number;
};

export type AdminCollegeFilters = {
  status?: string;
  discovery?: boolean;
  state?: string;
  city?: string;
  min_students?: number;
};

export type AdminCollegeSort =
  | "newest"
  | "oldest"
  | "name"
  | "most_students"
  | "least_students"
  | "active_users"
  | "online"
  | "matches"
  | "messages"
  | "completion"
  | "growth";

export type CollegeDetail = {
  id: string;
  name: string;
  code: string | null;
  short_name: string | null;
  description: string | null;
  website: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: CollegeStatus;
  discovery_enabled: boolean;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CollegeStats = {
  totalStudents: number;
  activeStudents: number;
  onlineStudents: number;
  maleStudents: number;
  femaleStudents: number;
  departments: number;
  matches: number;
  messages: number;
  swipes: number;
  likes: number;
  verified: number;
  departmentBreakdown: { name: string; count: number }[];
  gradYears: { year: number; count: number }[];
};

export type CollegeTimeseriesPoint = { day: string; registrations: number; activeUsers: number };

export type CollegeStudentRow = {
  id: string;
  full_name: string | null;
  avatar: string | null;
  gender: string | null;
  age: number | null;
  department_name: string | null;
  semester: number | null;
  account_status: string;
  verification_status: string;
  last_login_at: string | null;
  created_at: string;
  total_count: number;
};

export type DepartmentRow = {
  id: string;
  name: string;
  is_active: boolean;
  college_id: string | null;
  member_count: number;
  created_at: string;
};

// --------------------------------------------------------------- validators
const filtersSchema = z
  .object({
    status: z.string().optional(),
    discovery: z.boolean().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    min_students: z.number().optional(),
  })
  .partial();

const listInput = z.object({
  search: z.string().max(80).optional().default(""),
  filters: filtersSchema.optional().default({}),
  sort: z
    .enum([
      "newest", "oldest", "name", "most_students", "least_students",
      "active_users", "online", "matches", "messages", "completion", "growth",
    ])
    .optional()
    .default("newest"),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
});

const idInput = z.object({ collegeId: z.string().uuid() });

const collegePayload = z.object({
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().max(40).optional().or(z.literal("")),
  short_name: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  district: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  logo_url: z.string().trim().max(500).optional().or(z.literal("")),
  banner_url: z.string().trim().max(500).optional().or(z.literal("")),
  discovery_enabled: z.boolean().optional(),
  status: z.enum(["active", "disabled", "archived"]).optional(),
});

// -------------------------------------------------------------------- reads
export const getCollegeSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CollegeSummary> => {
    const { data, error } = await context.supabase.rpc("admin_college_summary");
    if (error) throw new Error(error.message);
    return data as unknown as CollegeSummary;
  });

export const listAdminColleges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }): Promise<{ rows: AdminCollegeRow[]; total: number }> => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_colleges", {
      _search: data.search,
      _filters: data.filters as never,
      _sort: data.sort,
      _limit: data.limit,
      _offset: data.offset,
    });
    if (error) throw new Error(error.message);
    const list = (rows as unknown as AdminCollegeRow[]) ?? [];
    const logos = await signBucketPaths(context.supabase, LOGO_BUCKET, list.map((r) => r.logo_url));
    const banners = await signBucketPaths(context.supabase, BANNER_BUCKET, list.map((r) => r.banner_url));
    const withMedia = list.map((r) => ({
      ...r,
      logo_url: resolveMediaUrl(r.logo_url, logos),
      banner_url: resolveMediaUrl(r.banner_url, banners),
    }));
    return { rows: withMedia, total: withMedia.length > 0 ? Number(withMedia[0].total_count) : 0 };
  });

export const getCollegeDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<CollegeDetail | null> => {
    const { data: res, error } = await context.supabase.rpc("admin_college_detail", { _id: data.collegeId });
    if (error) throw new Error(error.message);
    if (!res) return null;
    const detail = res as unknown as CollegeDetail;
    const logos = await signBucketPaths(context.supabase, LOGO_BUCKET, [detail.logo_url]);
    const banners = await signBucketPaths(context.supabase, BANNER_BUCKET, [detail.banner_url]);
    return {
      ...detail,
      logo_url: resolveMediaUrl(detail.logo_url, logos),
      banner_url: resolveMediaUrl(detail.banner_url, banners),
    };
  });

export const getCollegeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<CollegeStats> => {
    const { data: res, error } = await context.supabase.rpc("admin_college_stats", { _id: data.collegeId });
    if (error) throw new Error(error.message);
    return res as unknown as CollegeStats;
  });

export const getCollegeTimeseries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ collegeId: z.string().uuid(), days: z.number().int().min(7).max(90).optional().default(30) }).parse(d))
  .handler(async ({ data, context }): Promise<CollegeTimeseriesPoint[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_college_timeseries", { _id: data.collegeId, _days: data.days });
    if (error) throw new Error(error.message);
    return (res as unknown as CollegeTimeseriesPoint[]) ?? [];
  });

export const listCollegeStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    collegeId: z.string().uuid(),
    search: z.string().max(80).optional().default(""),
    limit: z.number().int().min(1).max(50).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
  }).parse(d))
  .handler(async ({ data, context }): Promise<{ rows: CollegeStudentRow[]; total: number }> => {
    const { data: rows, error } = await context.supabase.rpc("admin_college_students", {
      _id: data.collegeId, _search: data.search, _limit: data.limit, _offset: data.offset,
    });
    if (error) throw new Error(error.message);
    const list = (rows as unknown as CollegeStudentRow[]) ?? [];
    const signed = await signAdminPaths(context.supabase, list.map((r) => r.avatar));
    const withAvatars = list.map((r) => ({ ...r, avatar: resolveAdminUrl(r.avatar, signed) }));
    return { rows: withAvatars, total: withAvatars.length > 0 ? Number(withAvatars[0].total_count) : 0 };
  });

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ collegeId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<DepartmentRow[]> => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_departments", { _college_id: data.collegeId ?? undefined });
    if (error) throw new Error(error.message);
    return (rows as unknown as DepartmentRow[]) ?? [];
  });

// --------------------------------------------------------------- moderation
export const setCollegeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ collegeId: z.string().uuid(), status: z.enum(["active", "disabled", "archived"]), reason: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; status: string }> => {
    const { data: res, error } = await context.supabase.rpc("admin_set_college_status", { _id: data.collegeId, _status: data.status, _reason: data.reason ?? undefined });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; status: string };
  });

export const setCollegeDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ collegeId: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; discovery_enabled: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_set_college_discovery", { _id: data.collegeId, _enabled: data.enabled });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; discovery_enabled: boolean };
  });

export const upsertCollege = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), payload: collegePayload }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; id: string }> => {
    const { data: res, error } = await context.supabase.rpc("admin_upsert_college", { _id: (data.id ?? null) as unknown as string, _payload: data.payload as never });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; id: string };
  });

export const deleteCollege = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_delete_college", { _id: data.collegeId });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const upsertDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(120), collegeId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; id: string }> => {
    const { data: res, error } = await context.supabase.rpc("admin_upsert_department", { _id: (data.id ?? null) as unknown as string, _name: data.name, _college_id: data.collegeId ?? undefined });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; id: string };
  });

export const setDepartmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_set_department_status", { _id: data.id, _active: data.active });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

// ------------------------------------------------------------- query options
export const collegeSummaryQuery = () =>
  queryOptions({ queryKey: ["admin", "colleges", "summary"], queryFn: () => getCollegeSummary() });

export const adminCollegesQuery = (params: z.input<typeof listInput>) =>
  queryOptions({ queryKey: ["admin", "colleges", "list", params], queryFn: () => listAdminColleges({ data: params }) });

export const collegeDetailQuery = (collegeId: string) =>
  queryOptions({ queryKey: ["admin", "college", collegeId, "detail"], queryFn: () => getCollegeDetail({ data: { collegeId } }) });
export const collegeStatsQuery = (collegeId: string) =>
  queryOptions({ queryKey: ["admin", "college", collegeId, "stats"], queryFn: () => getCollegeStats({ data: { collegeId } }) });
export const collegeTimeseriesQuery = (collegeId: string, days = 30) =>
  queryOptions({ queryKey: ["admin", "college", collegeId, "timeseries", days], queryFn: () => getCollegeTimeseries({ data: { collegeId, days } }) });
export const collegeStudentsQuery = (collegeId: string, search: string, limit: number, offset: number) =>
  queryOptions({ queryKey: ["admin", "college", collegeId, "students", search, limit, offset], queryFn: () => listCollegeStudents({ data: { collegeId, search, limit, offset } }) });
export const departmentsQuery = (collegeId?: string) =>
  queryOptions({ queryKey: ["admin", "college", collegeId ?? "all", "departments"], queryFn: () => listDepartments({ data: { collegeId } }) });
