// ============================================================================
// Admin Settings module server functions — thin, admin-gated wrappers over the
// SECURITY DEFINER RPCs created in the settings migration. Every RPC re-checks
// has_role(auth.uid(),'admin') on the server and raises 'Forbidden' otherwise,
// so a bypassed UI can never read or mutate platform configuration.
// This file stays thin (server fn declarations + client-safe imports only).
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

// ------------------------------------------------------------------- types
export type SettingsBundle = { [key: string]: Json | undefined } & {
  maintenance: Json | null;
  feature_flags: { key: string; enabled: boolean; payload: Json }[];
};

export type SettingsOverview = {
  maintenance_enabled: boolean;
  active_users: number;
  online_users: number;
  current_version: string;
  min_version: string;
  feature_flags_count: number;
  feature_flags_on: number;
  changes_24h: number;
  last_update: string | null;
};

export type StorageStats = {
  total_objects: number;
  total_bytes: number;
  by_bucket: Record<string, number>;
};

export type SettingsHistoryEntry = {
  id: string;
  category: string;
  setting_key: string | null;
  previous_value: Json | null;
  new_value: Json | null;
  reason: string | null;
  created_at: string;
  admin_name: string;
};

export type SettingsHistoryPage = { total: number; rows: SettingsHistoryEntry[] };

// ------------------------------------------------------------- validators
const updateSchema = z.object({
  category: z.string().min(1).max(40),
  values: z.record(z.string(), z.unknown()),
  reason: z.string().max(500).optional(),
});
const resetSchema = z.object({ category: z.string().min(1).max(40), reason: z.string().max(500).optional() });
const flagSchema = z.object({
  key: z.string().min(1).max(80),
  enabled: z.boolean(),
  payload: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().max(500).optional(),
});
const maintenanceSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  reason: z.string().max(500).optional(),
});
const historySchema = z.object({
  category: z.string().max(40).nullish(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
const importSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  reason: z.string().max(500).optional(),
});

// ------------------------------------------------------------- read: all
export const getAllSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SettingsBundle> => {
    const { data, error } = await context.supabase.rpc("admin_settings_get_all");
    if (error) throw new Error(error.message);
    return data as unknown as SettingsBundle;
  });

export const getSettingsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SettingsOverview> => {
    const { data, error } = await context.supabase.rpc("admin_settings_overview");
    if (error) throw new Error(error.message);
    return data as unknown as SettingsOverview;
  });

export const getStorageStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StorageStats> => {
    const { data, error } = await context.supabase.rpc("admin_storage_stats");
    if (error) throw new Error(error.message);
    return data as unknown as StorageStats;
  });

export const getSettingsHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => historySchema.parse(d))
  .handler(async ({ data, context }): Promise<SettingsHistoryPage> => {
    const { data: res, error } = await context.supabase.rpc("admin_settings_history", {
      _category: data.category ?? undefined,
      _limit: data.limit ?? 30,
      _offset: data.offset ?? 0,
    });
    if (error) throw new Error(error.message);
    return res as unknown as SettingsHistoryPage;
  });

// ------------------------------------------------------------- mutations
export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }): Promise<Json> => {
    const { data: res, error } = await context.supabase.rpc("admin_settings_update", {
      _category: data.category,
      _values: data.values as never,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as Json;
  });

export const resetSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resetSchema.parse(d))
  .handler(async ({ data, context }): Promise<Json> => {
    const { data: res, error } = await context.supabase.rpc("admin_settings_reset", {
      _category: data.category,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as Json;
  });

export const setFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => flagSchema.parse(d))
  .handler(async ({ data, context }): Promise<Json> => {
    const { data: res, error } = await context.supabase.rpc("admin_feature_flag_set", {
      _key: data.key,
      _enabled: data.enabled,
      _payload: (data.payload ?? {}) as never,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as Json;
  });

export const updateMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => maintenanceSchema.parse(d))
  .handler(async ({ data, context }): Promise<Json> => {
    const { data: res, error } = await context.supabase.rpc("admin_maintenance_update", {
      _values: data.values as never,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as Json;
  });

export const exportSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Json> => {
    const { data, error } = await context.supabase.rpc("admin_settings_export");
    if (error) throw new Error(error.message);
    return data as unknown as Json;
  });

export const importSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => importSchema.parse(d))
  .handler(async ({ data, context }): Promise<Json> => {
    const { data: res, error } = await context.supabase.rpc("admin_settings_import", {
      _payload: data.payload as never,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as Json;
  });

// ------------------------------------------------------------- query options
export const settingsAllQuery = () =>
  queryOptions({ queryKey: ["admin", "settings", "all"], queryFn: () => getAllSettings() });

export const settingsOverviewQuery = () =>
  queryOptions({ queryKey: ["admin", "settings", "overview"], queryFn: () => getSettingsOverview() });

export const storageStatsQuery = () =>
  queryOptions({ queryKey: ["admin", "settings", "storage"], queryFn: () => getStorageStats() });

export const settingsHistoryQuery = (category?: string | null) =>
  queryOptions({
    queryKey: ["admin", "settings", "history", category ?? "all"],
    queryFn: () => getSettingsHistory({ data: { category: category ?? null, limit: 40, offset: 0 } }),
  });
