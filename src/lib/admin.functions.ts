// ============================================================================
// Admin module server functions — every function is admin-gated on the server.
// The underlying SQL RPCs each re-check has_role(auth.uid(),'admin') and raise
// 'Forbidden' otherwise, so even a bypassed UI cannot read admin data. The
// bootstrap function is the one exception: it is callable only while NO admin
// exists yet (first-run setup), then permanently self-disables.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------------------------------------------------------------------ types
export type AdminStats = {
  totalUsers: number;
  verifiedUsers: number;
  activeToday: number;
  usersOnline: number;
  newToday: number;
  maleUsers: number;
  femaleUsers: number;
  totalColleges: number;
  totalDepartments: number;
  totalSwipes: number;
  totalLikes: number;
  totalPasses: number;
  totalMatches: number;
  matchesToday: number;
  messagesToday: number;
  totalConversations: number;
  imagesUploaded: number;
  reportsPending: number;
  blockedUsers: number;
  deletedAccounts: number;
  suspendedAccounts: number;
};

export type TimeseriesPoint = {
  day: string;
  signups: number;
  matches: number;
  messages: number;
  activeUsers: number;
  photos: number;
};

export type Distribution = {
  gender: Record<string, number>;
  departments: { name: string; count: number }[];
  topColleges: { name: string; count: number }[];
  profileCompletion: { completed: number; incomplete: number };
  collegeGrowth30d: number;
};

export type ActivityEvent = {
  type: "registration" | "match" | "message" | "report" | "block" | "admin_action";
  title: string;
  ts: string;
  id: string;
};

export type SystemHealth = {
  database: boolean;
  realtime: boolean;
  storage: boolean;
  auth: boolean;
  checkedAt: string;
};

export type AdminSearchResult = {
  users: { id: string; name: string | null; phone: string | null; status: string }[];
  colleges: { id: string; name: string; city: string | null }[];
  reports: { id: string; reason: string; status: string }[];
};

// ------------------------------------------------------------- role check
export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (error) return false;
    return data === true;
  });

// ----------------------------------------------------------- dashboard stats
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    const { data, error } = await context.supabase.rpc("admin_dashboard_stats");
    if (error) throw new Error(error.message);
    return data as unknown as AdminStats;
  });

export const getAdminTimeseries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number }) => ({ days: d?.days ?? 14 }))
  .handler(async ({ data, context }): Promise<TimeseriesPoint[]> => {
    const { data: rows, error } = await context.supabase.rpc("admin_timeseries", { _days: data.days });
    if (error) throw new Error(error.message);
    return (rows as unknown as TimeseriesPoint[]) ?? [];
  });

export const getAdminDistribution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Distribution> => {
    const { data, error } = await context.supabase.rpc("admin_distribution");
    if (error) throw new Error(error.message);
    return data as unknown as Distribution;
  });

export const getAdminActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => ({ limit: d?.limit ?? 25 }))
  .handler(async ({ data, context }): Promise<ActivityEvent[]> => {
    const { data: rows, error } = await context.supabase.rpc("admin_recent_activity", { _limit: data.limit });
    if (error) throw new Error(error.message);
    return (rows as unknown as ActivityEvent[]) ?? [];
  });

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SystemHealth> => {
    const { supabase, userId } = context;
    // Admin-gate via a cheap admin RPC; non-admins get every check as false.
    const { error: roleErr } = await supabase.rpc("admin_dashboard_stats");
    if (roleErr) {
      return { database: false, realtime: false, storage: false, auth: false, checkedAt: new Date().toISOString() };
    }
    const database = true; // the RPC above round-tripped successfully
    let storage = false;
    try {
      const { error } = await supabase.storage.from("profile-photos").list("", { limit: 1 });
      storage = !error;
    } catch {
      storage = false;
    }
    const auth = Boolean(userId);
    return { database, realtime: database, storage, auth, checkedAt: new Date().toISOString() };
  });

export const adminSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => ({ q: (d?.q ?? "").trim().slice(0, 80) }))
  .handler(async ({ data, context }): Promise<AdminSearchResult> => {
    const { data: res, error } = await context.supabase.rpc("admin_search", { _q: data.q });
    if (error) throw new Error(error.message);
    return res as unknown as AdminSearchResult;
  });

export const logAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action: string; targetTable?: string; targetId?: string; metadata?: Record<string, unknown> }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { error } = await context.supabase.rpc("admin_log_action", {
      _action: data.action,
      _target_table: data.targetTable ?? undefined,
      _target_id: data.targetId ?? undefined,
      _metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------- first-run bootstrap
// Creates the single admin account. Works ONLY while no admin exists yet, then
// permanently refuses. PIN is stored as the Supabase Auth password (bcrypt).
const bootstrapSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
  secret: z.string().min(1),
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => bootstrapSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; created: boolean }> => {
    const seed = process.env.SEED_SECRET;
    if (!seed || data.secret !== seed) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Refuse if an admin already exists.
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Admin already configured");

    const alias = `91${data.phone}@coligo.phone`;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: alias,
      password: data.pin,
      email_confirm: true,
      user_metadata: { phone: `+91${data.phone}`, display_name: "Administrator", is_admin: true },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create admin");

    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert({ id: uid, phone: `+91${data.phone}`, display_name: "Administrator", account_status: "active" });
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (roleErr) throw new Error(roleErr.message);
    return { ok: true, created: true };
  });

// ------------------------------------------------------------- query options
export const adminStatsQuery = () => queryOptions({ queryKey: ["admin", "stats"], queryFn: () => getAdminStats() });
export const adminTimeseriesQuery = (days = 14) =>
  queryOptions({ queryKey: ["admin", "timeseries", days], queryFn: () => getAdminTimeseries({ data: { days } }) });
export const adminDistributionQuery = () =>
  queryOptions({ queryKey: ["admin", "distribution"], queryFn: () => getAdminDistribution() });
export const adminActivityQuery = (limit = 25) =>
  queryOptions({ queryKey: ["admin", "activity", limit], queryFn: () => getAdminActivity({ data: { limit } }) });
export const systemHealthQuery = () =>
  queryOptions({ queryKey: ["admin", "health"], queryFn: () => getSystemHealth(), refetchInterval: 30_000 });
export const adminGuardQuery = () => queryOptions({ queryKey: ["admin", "guard"], queryFn: () => isAdmin() });
