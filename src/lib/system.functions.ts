// ============================================================================
// System module server functions.
// Reads (app config) use the anon-scoped publishable client so RLS applies as
// an anonymous user. Writes (logs, error reports, support tickets) are
// write-only public endpoints validated with zod. Device-session registration
// is authenticated and RLS-scoped to the current user.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// ---------------------------------------------------------------- App config
export type AppConfig = {
  maintenanceEnabled: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  estimatedCompletion: string | null;
  supportEmail: string;
  minAppVersion: string | null;
  featureFlags: Record<string, { enabled: boolean; payload: unknown }>;
  latestVersion: {
    version: string;
    minSupported: string | null;
    forceUpdate: boolean;
  } | null;
};

const DEFAULT_CONFIG: AppConfig = {
  maintenanceEnabled: false,
  maintenanceTitle: "We'll be right back",
  maintenanceMessage:
    "CampusMatch is undergoing scheduled maintenance. Please check back soon.",
  estimatedCompletion: null,
  supportEmail: "support@campusmatch.app",
  minAppVersion: null,
  featureFlags: {},
  latestVersion: null,
};

export const getAppConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppConfig> => {
    const supabase = publicClient();

    const [settingsRes, flagsRes, versionRes] = await Promise.all([
      supabase
        .from("application_settings")
        .select(
          "maintenance_enabled, maintenance_title, maintenance_message, estimated_completion, support_email, min_app_version",
        )
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("feature_flags").select("key, enabled, payload"),
      supabase
        .from("app_versions")
        .select("version, min_supported, force_update")
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (settingsRes.error) throw new Error(settingsRes.error.message);

    const s = settingsRes.data;
    const featureFlags: AppConfig["featureFlags"] = {};
    for (const f of flagsRes.data ?? []) {
      featureFlags[f.key] = { enabled: f.enabled, payload: f.payload };
    }

    return {
      maintenanceEnabled: s?.maintenance_enabled ?? DEFAULT_CONFIG.maintenanceEnabled,
      maintenanceTitle: s?.maintenance_title ?? DEFAULT_CONFIG.maintenanceTitle,
      maintenanceMessage: s?.maintenance_message ?? DEFAULT_CONFIG.maintenanceMessage,
      estimatedCompletion: s?.estimated_completion ?? null,
      supportEmail: s?.support_email ?? DEFAULT_CONFIG.supportEmail,
      minAppVersion: s?.min_app_version ?? null,
      featureFlags,
      latestVersion: versionRes.data
        ? {
            version: versionRes.data.version,
            minSupported: versionRes.data.min_supported,
            forceUpdate: versionRes.data.force_update,
          }
        : null,
    };
  },
);

export const appConfigQuery = () =>
  queryOptions({
    queryKey: ["system", "app-config"],
    queryFn: () => getAppConfig(),
    staleTime: 30_000,
  });

// ---------------------------------------------------------------- Unknown routes
const logRouteSchema = z.object({
  path: z.string().trim().min(1).max(2048),
  referrer: z.string().trim().max(2048).optional().default(""),
  userId: z.string().uuid().nullable().optional().default(null),
});

export const logUnknownRoute = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => logRouteSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const supabase = publicClient();
    await supabase.from("system_logs").insert({
      event_type: "unknown_route",
      path: data.path,
      referrer: data.referrer || null,
      user_id: data.userId,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------- Error reports
const reportErrorSchema = z.object({
  route: z.string().trim().max(2048).optional().default(""),
  message: z.string().trim().max(4000).optional().default(""),
  stack: z.string().trim().max(20000).optional().default(""),
  sessionId: z.string().trim().max(128).optional().default(""),
  userId: z.string().uuid().nullable().optional().default(null),
  deviceInfo: z.record(z.string(), z.unknown()).optional().default({}),
});

function makeErrorId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ERR-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export const reportError = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reportErrorSchema.parse(d))
  .handler(async ({ data }): Promise<{ errorId: string }> => {
    const supabase = publicClient();
    const errorId = makeErrorId();
    const { error } = await supabase.from("error_reports").insert({
      error_id: errorId,
      route: data.route || null,
      message: data.message || null,
      stack: data.stack || null,
      session_id: data.sessionId || null,
      user_id: data.userId,
      device_info: data.deviceInfo,
    });
    if (error) throw new Error(error.message);
    return { errorId };
  });

// ---------------------------------------------------------------- Support ticket
const supportTicketSchema = z.object({
  errorId: z.string().trim().min(1).max(128),
  message: z.string().trim().max(4000).optional().default(""),
  email: z.string().trim().email().optional().default("anonymous@campusmatch.app"),
});

export const createSupportTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => supportTicketSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const supabase = publicClient();
    const { error } = await supabase.from("contact_messages").insert({
      name: "System Error Report",
      email: data.email,
      subject: `Error report ${data.errorId}`,
      category: "bug",
      message: data.message
        ? `${data.message}\n\nReference: ${data.errorId}`
        : `Automated report for error ${data.errorId}.`,
      source: "500_page",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------- Device session
const deviceSchema = z.object({
  deviceToken: z.string().trim().min(1).max(256),
  platform: z.string().trim().max(32).optional().default("web"),
});

export const registerDeviceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deviceSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("device_sessions").upsert(
      {
        user_id: userId,
        device_token: data.deviceToken,
        platform: data.platform,
        last_seen_at: new Date().toISOString(),
        revoked: false,
      },
      { onConflict: "user_id,device_token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
