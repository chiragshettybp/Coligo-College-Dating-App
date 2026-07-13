// ============================================================================
// /admin/settings — Coligo platform configuration center. Every setting is read
// from and written to Supabase through admin-gated server functions; changes are
// audited and propagate live via Supabase Realtime. Non-admins are redirected to
// /admin/login. Future-only options are shown as clearly labelled "Soon" tiles
// rather than fabricated controls.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Activity,
  Radio,
  Wrench,
  Flag,
  Database,
  History as HistoryIcon,
  Download,
  Upload,
  RotateCcw,
  Save,
  Search as SearchIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
} from "lucide-react";

import { adminGuardQuery } from "@/lib/admin.functions";
import {
  settingsAllQuery,
  settingsOverviewQuery,
  storageStatsQuery,
  settingsHistoryQuery,
  updateSettings,
  resetSettings,
  setFeatureFlag,
  updateMaintenance,
  exportSettings,
  importSettings,
  type SettingsBundle,
  type SettingsOverview,
  type StorageStats,
  type SettingsHistoryPage,
} from "@/lib/admin-settings.functions";
import { useAdminSettingsRealtime } from "@/lib/use-admin-settings-realtime";
import {
  CATEGORIES,
  FEATURE_FLAG_KEYS,
  validateCategory,
  coerceValues,
  isDirty,
  humanBytes,
  timeAgo,
  downloadJSON,
  type Category,
  type Field,
  type SettingsValues,
} from "@/components/admin/settings-bits";
import { Text, Button, Toggle, TextField, Skeleton, Badge } from "@/components/ds/glass";
import { Card, StatCard, SettingsCard } from "@/components/ds/card";
import { TopBar, SearchBar, ScrollTabs } from "@/components/ds/navigation";
import { colors, spacing, surfaces, radii } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const I = { width: 16, height: 16 } as const;

export const Route = createFileRoute("/admin/settings/")({
  head: () => ({
    meta: [
      { title: "Settings — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsGuard,
});

function SettingsGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError, refetch } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 420, padding: spacing[6] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Couldn't reach the server</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>Check your connection and try again.</Text>
        <div style={{ marginTop: spacing[4] }}>
          <Button variant="primary" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }
  if (!allowed) return null;
  return <SettingsConsole />;
}

function PageSkeleton() {
  return (
    <div style={{ padding: spacing[3], display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <Skeleton style={{ height: 48, borderRadius: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[2] }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 92, borderRadius: 16 }} />
        ))}
      </div>
      <Skeleton style={{ height: 320, borderRadius: 16 }} />
    </div>
  );
}

const TABS = [
  "Overview",
  ...CATEGORIES.map((c) => c.label),
  "Feature Flags",
  "Maintenance",
  "Storage",
  "History",
  "Backup",
] as const;

function SettingsConsole() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>("Overview");
  const [search, setSearch] = useState("");

  useAdminSettingsRealtime(true);

  const bundle = useQuery(settingsAllQuery());
  const overview = useQuery(settingsOverviewQuery());

  const activeCategory = CATEGORIES.find((c) => c.label === tab) ?? null;

  return (
    <div style={{ paddingBottom: spacing[8] }}>
      <TopBar
        title="Settings"
        onBack={() => navigate({ to: "/admin/dashboard" })}
        trailing={
          <Badge tone={overview.data?.maintenance_enabled ? "danger" : "success"}>
            {overview.data?.maintenance_enabled ? "Maintenance" : "Live"}
          </Badge>
        }
      />

      <div style={{ padding: spacing[3], display: "flex", flexDirection: "column", gap: spacing[3] }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search settings"
          icon={<SearchIcon style={I} />}
        />

        <div style={{ borderBottom: `1px solid ${surfaces.borderSoft}` }}>
          <ScrollTabs options={[...TABS]} value={tab} onChange={setTab} />
        </div>

        {tab === "Overview" && <OverviewPanel overview={overview.data} loading={overview.isLoading} />}

        {activeCategory && bundle.data && (
          <CategoryForm
            key={activeCategory.key}
            category={activeCategory}
            initial={(bundle.data[activeCategory.key] as SettingsValues) ?? {}}
            search={search}
          />
        )}
        {activeCategory && !bundle.data && <Skeleton style={{ height: 300, borderRadius: 16 }} />}

        {tab === "Feature Flags" && <FeatureFlagsPanel bundle={bundle.data} />}
        {tab === "Maintenance" && <MaintenancePanel bundle={bundle.data} />}
        {tab === "Storage" && <StoragePanel bundle={bundle.data} />}
        {tab === "History" && <HistoryPanel />}
        {tab === "Backup" && <BackupPanel />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Overview */
function OverviewPanel({ overview, loading }: { overview?: SettingsOverview; loading: boolean }) {
  if (loading || !overview) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[2] }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 92, borderRadius: 16 }} />
        ))}
      </div>
    );
  }
  const cards: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: "Platform", value: overview.maintenance_enabled ? "Maintenance" : "Online", icon: <ShieldCheck style={I} /> },
    { label: "Active users (7d)", value: String(overview.active_users), icon: <Activity style={I} /> },
    { label: "Online now", value: String(overview.online_users), icon: <Radio style={I} /> },
    { label: "Current version", value: overview.current_version, icon: <SettingsIcon style={I} /> },
    { label: "Min version", value: overview.min_version, icon: <SettingsIcon style={I} /> },
    { label: "Feature flags on", value: `${overview.feature_flags_on}/${overview.feature_flags_count}`, icon: <Flag style={I} /> },
    { label: "Changes (24h)", value: String(overview.changes_24h), icon: <HistoryIcon style={I} /> },
    { label: "Last update", value: timeAgo(overview.last_update), icon: <Clock style={I} /> },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[2] }}>
      {cards.map((c) => (
        <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Status line */
function StatusLine({ status }: { status: null | { ok: boolean; msg: string } }) {
  if (!status) return null;
  return (
    <div
      className="flex items-center"
      style={{
        gap: spacing[2],
        padding: `${spacing[2]}px ${spacing[3]}px`,
        borderRadius: radii.md,
        background: status.ok ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)",
        color: status.ok ? colors.success : colors.danger,
      }}
    >
      {status.ok ? <CheckCircle2 style={I} /> : <AlertTriangle style={I} />}
      <Text variant="caption" color={status.ok ? colors.success : colors.danger}>{status.msg}</Text>
    </div>
  );
}

/* -------------------------------------------------------------- Field control */
function FieldRow({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  return (
    <div style={{ padding: `${spacing[2]}px 0`, borderBottom: `1px solid ${surfaces.borderSoft}` }}>
      <div className="flex items-center justify-between" style={{ gap: spacing[3] }}>
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center" style={{ gap: spacing[2] }}>
            <Text variant="body" color={colors.textPrimary}>{field.label}</Text>
            {field.comingSoon && <Badge tone="warning">Soon</Badge>}
          </div>
          {field.hint && <Text variant="caption" tone="secondary">{field.hint}</Text>}
        </div>
        <div className="shrink-0">
          {field.type === "toggle" && (
            <Toggle
              checked={Boolean(value)}
              onChange={(v) => !field.comingSoon && onChange(v)}
            />
          )}
          {field.type === "number" && (
            <input
              type="number"
              disabled={field.comingSoon}
              value={value === undefined || value === null ? "" : String(value)}
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              onChange={(e) => onChange(e.target.value)}
              className="text-white outline-none"
              style={{
                width: 110,
                textAlign: "right",
                borderRadius: radii.sm,
                padding: "8px 10px",
                fontSize: 15,
                background: surfaces.glassSoft,
                border: `1px solid ${error ? colors.danger : surfaces.border}`,
              }}
            />
          )}
          {field.type === "select" && (
            <select
              disabled={field.comingSoon}
              value={String(value ?? "")}
              onChange={(e) => onChange(e.target.value)}
              className="text-white outline-none"
              style={{
                borderRadius: radii.sm,
                padding: "8px 10px",
                fontSize: 15,
                background: surfaces.glassSoft,
                border: `1px solid ${surfaces.border}`,
              }}
            >
              {field.options?.map((o) => (
                <option key={o.value} value={o.value} style={{ color: "#000" }}>{o.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      {(field.type === "text" || field.type === "textarea") && (
        <div style={{ marginTop: spacing[2] }}>
          {field.type === "text" ? (
            <TextField
              value={String(value ?? "")}
              error={error}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <textarea
              value={String(value ?? "")}
              rows={3}
              onChange={(e) => onChange(e.target.value)}
              className="w-full text-white outline-none placeholder:text-white/40"
              style={{
                borderRadius: radii.md,
                padding: "12px 16px",
                fontSize: 15,
                background: surfaces.glassSoft,
                border: `1px solid ${error ? colors.danger : surfaces.border}`,
                resize: "vertical",
              }}
            />
          )}
        </div>
      )}
      {error && field.type === "number" && (
        <Text variant="caption" color={colors.danger} style={{ marginTop: 4 }}>{error}</Text>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Category form */
function CategoryForm({ category, initial, search }: { category: Category; initial: SettingsValues; search: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SettingsValues>(initial);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Re-sync when the underlying server value changes (realtime) and no local edits.
  const dirty = isDirty(category.fields, draft, initial);
  useEffect(() => {
    if (!dirty) setDraft(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initial)]);

  const errors = useMemo(() => validateCategory(category.fields, draft), [category.fields, draft]);
  const hasErrors = Object.keys(errors).length > 0;

  const save = useMutation({
    mutationFn: (vars: { values: SettingsValues; reason: string }) =>
      updateSettings({ data: { category: category.key, values: vars.values, reason: vars.reason } }),
    onSuccess: () => {
      setStatus({ ok: true, msg: "Settings saved" });
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: Error) => setStatus({ ok: false, msg: e.message || "Save failed. Your changes are preserved." }),
  });

  const reset = useMutation({
    mutationFn: () => resetSettings({ data: { category: category.key, reason: "Reset to defaults" } }),
    onSuccess: () => {
      setStatus({ ok: true, msg: "Reset to defaults" });
      setConfirmReset(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: Error) => setStatus({ ok: false, msg: e.message || "Reset failed" }),
  });

  const visibleFields = search.trim()
    ? category.fields.filter((f) => f.label.toLowerCase().includes(search.trim().toLowerCase()))
    : category.fields;

  if (confirmReset) {
    return (
      <Card>
        <div style={{ padding: spacing[4], display: "flex", flexDirection: "column", gap: spacing[3] }}>
          <Text variant="headingSm" color={colors.textPrimary}>Reset {category.label} settings?</Text>
          <Text variant="body" tone="secondary">
            This restores every {category.label} setting to its shipped default and records the change in the audit log.
          </Text>
          <StatusLine status={status} />
          <div className="flex" style={{ gap: spacing[2] }}>
            <Button variant="danger" loading={reset.isPending} onClick={() => reset.mutate()}>Reset to defaults</Button>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: spacing[4] }}>
        <Text variant="headingSm" color={colors.textPrimary}>{category.label}</Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>{category.desc}</Text>

        <div style={{ marginTop: spacing[3] }}>
          {visibleFields.length === 0 ? (
            <Text variant="body" tone="secondary">No settings match "{search}".</Text>
          ) : (
            visibleFields.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                value={draft[f.key]}
                error={errors[f.key]}
                onChange={(v) => {
                  setStatus(null);
                  setDraft((d) => ({ ...d, [f.key]: v }));
                }}
              />
            ))
          )}
        </div>

        <div style={{ marginTop: spacing[3], display: "flex", flexDirection: "column", gap: spacing[2] }}>
          <TextField
            label="Reason (optional, stored in audit log)"
            value={reason}
            placeholder="Why are you changing this?"
            onChange={(e) => setReason(e.target.value)}
          />
          <StatusLine status={status} />
          <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
            <Button
              variant="primary"
              leftIcon={<Save style={I} />}
              disabled={!dirty || hasErrors}
              loading={save.isPending}
              onClick={() => {
                haptic("medium");
                save.mutate({ values: coerceValues(category.fields, draft), reason });
              }}
            >
              Save changes
            </Button>
            <Button variant="secondary" disabled={!dirty} onClick={() => setDraft(initial)}>Discard</Button>
            <Button variant="ghost" leftIcon={<RotateCcw style={I} />} onClick={() => setConfirmReset(true)}>Reset category</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------- Feature flags */
function FeatureFlagsPanel({ bundle }: { bundle?: SettingsBundle }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);

  const set = useMutation({
    mutationFn: (vars: { key: string; enabled: boolean }) =>
      setFeatureFlag({ data: { key: vars.key, enabled: vars.enabled, reason: "Toggled from settings" } }),
    onSuccess: () => {
      setStatus({ ok: true, msg: "Feature flag updated" });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: Error) => setStatus({ ok: false, msg: e.message }),
  });

  if (!bundle) return <Skeleton style={{ height: 300, borderRadius: 16 }} />;

  const existing = new Map(bundle.feature_flags.map((f) => [f.key, f.enabled]));
  const keys = Array.from(new Set([...FEATURE_FLAG_KEYS, ...bundle.feature_flags.map((f) => f.key)]));

  return (
    <Card>
      <div style={{ padding: spacing[4] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Feature flags</Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
          Toggling a flag immediately affects the relevant module across the app.
        </Text>
        <div style={{ marginTop: spacing[3] }}>
          {keys.map((key) => {
            const enabled = existing.get(key) ?? false;
            return (
              <div key={key} className="flex items-center justify-between" style={{ padding: `${spacing[2]}px 0`, borderBottom: `1px solid ${surfaces.borderSoft}` }}>
                <Text variant="body" color={colors.textPrimary} style={{ textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</Text>
                <Toggle checked={enabled} onChange={(v) => set.mutate({ key, enabled: v })} />
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: spacing[3] }}>
          <StatusLine status={status} />
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------- Maintenance */
function MaintenancePanel({ bundle }: { bundle?: SettingsBundle }) {
  const qc = useQueryClient();
  const m = (bundle?.maintenance as Record<string, unknown> | null) ?? null;
  const [enabled, setEnabled] = useState<boolean>(Boolean(m?.maintenance_enabled));
  const [title, setTitle] = useState<string>(String(m?.maintenance_title ?? ""));
  const [message, setMessage] = useState<string>(String(m?.maintenance_message ?? ""));
  const [minVersion, setMinVersion] = useState<string>(String(m?.min_app_version ?? ""));
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(m?.maintenance_enabled));
    setTitle(String(m?.maintenance_title ?? ""));
    setMessage(String(m?.maintenance_message ?? ""));
    setMinVersion(String(m?.min_app_version ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(m)]);

  const save = useMutation({
    mutationFn: () =>
      updateMaintenance({
        data: {
          values: {
            maintenance_enabled: enabled,
            maintenance_title: title,
            maintenance_message: message,
            min_app_version: minVersion,
          },
          reason: enabled ? "Maintenance enabled" : "Maintenance updated",
        },
      }),
    onSuccess: () => {
      setStatus({ ok: true, msg: "Maintenance settings saved" });
      setConfirm(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: Error) => setStatus({ ok: false, msg: e.message }),
  });

  if (!bundle) return <Skeleton style={{ height: 300, borderRadius: 16 }} />;

  if (confirm) {
    return (
      <Card>
        <div style={{ padding: spacing[4], display: "flex", flexDirection: "column", gap: spacing[3] }}>
          <Text variant="headingSm" color={colors.textPrimary}>{enabled ? "Enable maintenance mode?" : "Save maintenance settings?"}</Text>
          <Text variant="body" tone="secondary">
            {enabled
              ? "Students will see the maintenance page immediately. Administrators keep full access."
              : "This updates the maintenance configuration for the whole platform."}
          </Text>
          <StatusLine status={status} />
          <div className="flex" style={{ gap: spacing[2] }}>
            <Button variant={enabled ? "danger" : "primary"} loading={save.isPending} onClick={() => save.mutate()}>Confirm</Button>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: spacing[4], display: "flex", flexDirection: "column", gap: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Maintenance mode</Text>
        <div className="flex items-center justify-between">
          <Text variant="body" color={colors.textPrimary}>Enable maintenance mode</Text>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>
        <TextField label="Maintenance title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <Text variant="caption" tone="secondary" style={{ marginBottom: 6 }}>Maintenance message</Text>
          <textarea
            value={message}
            rows={3}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full text-white outline-none"
            style={{ borderRadius: radii.md, padding: "12px 16px", fontSize: 15, background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, resize: "vertical" }}
          />
        </div>
        <TextField label="Minimum app version" value={minVersion} onChange={(e) => setMinVersion(e.target.value)} />
        <StatusLine status={status} />
        <div className="flex" style={{ gap: spacing[2] }}>
          <Button variant="primary" leftIcon={<Wrench style={I} />} onClick={() => setConfirm(true)}>Save maintenance</Button>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- Storage */
const STORAGE_ACTIONS = ["Clear Cache", "Regenerate Thumbnails", "Cleanup Orphan Files", "Storage Integrity Check"];

function StoragePanel({ bundle }: { bundle?: SettingsBundle }) {
  const stats = useQuery(storageStatsQuery());
  const s: StorageStats | undefined = stats.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <Card>
        <div style={{ padding: spacing[4] }}>
          <Text variant="headingSm" color={colors.textPrimary}>Storage usage</Text>
          {stats.isLoading || !s ? (
            <Skeleton style={{ height: 80, borderRadius: 12, marginTop: spacing[3] }} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: spacing[2], marginTop: spacing[3] }}>
              <StatCard label="Total objects" value={String(s.total_objects)} icon={<Database style={I} />} />
              <StatCard label="Total size" value={humanBytes(s.total_bytes)} icon={<HardDrive style={I} />} />
              {Object.entries(s.by_bucket).map(([b, c]) => (
                <StatCard key={b} label={b} value={String(c)} icon={<Database style={I} />} />
              ))}
            </div>
          )}
        </div>
      </Card>
      <Card>
        <div style={{ padding: spacing[4] }}>
          <Text variant="headingSm" color={colors.textPrimary}>Storage maintenance</Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>Bulk storage jobs — arriving in a future release.</Text>
          <div className="flex flex-wrap" style={{ gap: spacing[2], marginTop: spacing[3] }}>
            {STORAGE_ACTIONS.map((a) => (
              <Button key={a} variant="secondary" disabled>{a} · Soon</Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- History */
function HistoryPanel() {
  const history = useQuery(settingsHistoryQuery(null));
  const page: SettingsHistoryPage | undefined = history.data;

  if (history.isLoading || !page) return <Skeleton style={{ height: 300, borderRadius: 16 }} />;

  if (page.rows.length === 0) {
    return (
      <Card>
        <div style={{ padding: spacing[5], textAlign: "center" }}>
          <Text variant="body" tone="secondary">No configuration changes recorded yet.</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: spacing[4] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Configuration history</Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>{page.total} total change{page.total === 1 ? "" : "s"} · immutable audit log</Text>
        <div style={{ marginTop: spacing[3], display: "flex", flexDirection: "column", gap: spacing[2] }}>
          {page.rows.map((r) => (
            <div key={r.id} style={{ padding: spacing[3], borderRadius: radii.md, background: surfaces.glassSoft, border: `1px solid ${surfaces.borderSoft}` }}>
              <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
                <Badge tone="info">{r.category.replace(/_/g, " ")}</Badge>
                <Text variant="caption" tone="secondary">{timeAgo(r.created_at)}</Text>
              </div>
              <Text variant="caption" tone="secondary" style={{ marginTop: 6 }}>
                {r.admin_name}{r.setting_key ? ` · ${r.setting_key}` : ""}{r.reason ? ` · ${r.reason}` : ""}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- Backup */
function BackupPanel() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);

  const doExport = useMutation({
    mutationFn: () => exportSettings(),
    onSuccess: (data) => {
      downloadJSON(`coligo-settings-${new Date().toISOString().slice(0, 10)}.json`, data);
      setStatus({ ok: true, msg: "Configuration exported" });
    },
    onError: (e: Error) => setStatus({ ok: false, msg: e.message }),
  });

  const doImport = useMutation({
    mutationFn: (payload: Record<string, unknown>) => importSettings({ data: { payload, reason: "Imported configuration" } }),
    onSuccess: () => {
      setStatus({ ok: true, msg: "Configuration imported" });
      setPending(null);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: Error) => setStatus({ ok: false, msg: e.message || "Import failed — no changes applied." }),
  });

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (typeof parsed !== "object" || parsed === null) throw new Error("bad");
        setStatus(null);
        setPending(parsed as Record<string, unknown>);
      } catch {
        setStatus({ ok: false, msg: "That file isn't valid settings JSON." });
      }
    };
    reader.readAsText(file);
  };

  if (pending) {
    return (
      <Card>
        <div style={{ padding: spacing[4], display: "flex", flexDirection: "column", gap: spacing[3] }}>
          <Text variant="headingSm" color={colors.textPrimary}>Import this configuration?</Text>
          <Text variant="body" tone="secondary">
            Every matching category will be overwritten and recorded in the audit log. The import is transactional — if anything fails, nothing is applied.
          </Text>
          <StatusLine status={status} />
          <div className="flex" style={{ gap: spacing[2] }}>
            <Button variant="primary" loading={doImport.isPending} onClick={() => doImport.mutate(pending)}>Apply import</Button>
            <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: spacing[4], display: "flex", flexDirection: "column", gap: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Backup & recovery</Text>
        <Text variant="caption" tone="secondary">Export the full platform configuration or restore it from a file.</Text>
        <StatusLine status={status} />
        <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
          <Button variant="primary" leftIcon={<Download style={I} />} loading={doExport.isPending} onClick={() => doExport.mutate()}>
            Export configuration
          </Button>
          <Button variant="secondary" leftIcon={<Upload style={I} />} onClick={() => fileRef.current?.click()}>
            Import configuration
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </Card>
  );
}
