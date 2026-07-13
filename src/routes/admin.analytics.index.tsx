// ============================================================================
// /admin/analytics — Coligo business-intelligence dashboard. Every KPI, chart,
// distribution, leaderboard, heatmap and moderation metric is generated from
// real Supabase data through admin-gated server functions. Filters (date range,
// college, department, gender, verification) persist in the URL and every
// widget updates live via Supabase Realtime. Non-admins are redirected to
// /admin/login. Metrics without a backing data source are shown as clearly
// labelled "coming soon" tiles rather than fabricated numbers.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Users,
  UserCheck,
  Activity,
  Radio,
  UserPlus,
  Building2,
  GraduationCap,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessagesSquare,
  MessageCircle,
  ImageIcon,
  Mic,
  Flag,
  Ban,
  ShieldAlert,
  Percent,
  Download,
  Filter as FilterIcon,
  CalendarDays,
  Sparkles,
  Clock,
  Lock,
} from "lucide-react";

import {
  analyticsKpisQuery,
  analyticsTimeseriesQuery,
  analyticsDistributionQuery,
  analyticsLeaderboardQuery,
  analyticsHeatmapQuery,
  analyticsModerationQuery,
  type AnalyticsFilters,
} from "@/lib/admin-analytics.functions";
import { adminGuardQuery, adminActivityQuery, systemHealthQuery, type ActivityEvent } from "@/lib/admin.functions";
import { adminCollegesQuery, departmentsQuery } from "@/lib/admin-colleges.functions";
import { useAdminAnalyticsRealtime } from "@/lib/use-admin-analytics-realtime";
import {
  DATE_PRESETS,
  rangeForPreset,
  fmt,
  fmtRangeLabel,
  exportCSV,
  exportXLSX,
  type DatePresetKey,
} from "@/components/admin/analytics-bits";
import { Text, Button, Chip, Skeleton } from "@/components/ds/glass";
import { Card, StatCard, EmptyStateCard } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { AreaTrend, BarSeries, Donut, Heatmap, LeaderboardList } from "@/components/admin/charts";
import { colors, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const I = { width: 16, height: 16 } as const;

type Search = {
  preset?: DatePresetKey;
  from?: string;
  to?: string;
  college?: string;
  department?: string;
  gender?: string;
  verification?: string;
};

export const Route = createFileRoute("/admin/analytics/")({
  head: () => ({
    meta: [
      { title: "Analytics — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    preset: typeof s.preset === "string" ? (s.preset as DatePresetKey) : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    college: typeof s.college === "string" ? s.college : undefined,
    department: typeof s.department === "string" ? s.department : undefined,
    gender: typeof s.gender === "string" ? s.gender : undefined,
    verification: typeof s.verification === "string" ? s.verification : undefined,
  }),
  component: AnalyticsGuard,
});

function AnalyticsGuard() {
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
  return <Analytics />;
}

function PageSkeleton() {
  return (
    <div style={{ padding: spacing[3], display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <Skeleton style={{ height: 48, borderRadius: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[2] }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 92, borderRadius: 16 }} />
        ))}
      </div>
      <Skeleton style={{ height: 240, borderRadius: 16 }} />
    </div>
  );
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
      <div className="flex items-center" style={{ gap: spacing[2] }}>
        <span style={{ color: colors.primary }}>{icon}</span>
        <Text variant="headingSm" color={colors.textPrimary}>{title}</Text>
      </div>
      {sub ? <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{sub}</Text> : null}
    </div>
  );
}

const grid = (min = 150): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
  gap: spacing[2],
});

function Analytics() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  useAdminAnalyticsRealtime(true);

  const preset: DatePresetKey = search.preset ?? "30d";
  const range = useMemo(
    () => rangeForPreset(preset, { from: search.from, to: search.to }),
    [preset, search.from, search.to],
  );
  const spanDays = (new Date(range.end).getTime() - new Date(range.start).getTime()) / 864e5;
  const bucket: "day" | "hour" = spanDays <= 2 ? "hour" : "day";

  const filters: AnalyticsFilters = useMemo(
    () => ({
      start: range.start,
      end: range.end,
      college: search.college || undefined,
      department: search.department || undefined,
      gender: search.gender || undefined,
      verification: search.verification || undefined,
    }),
    [range, search.college, search.department, search.gender, search.verification],
  );

  const setSearch = (patch: Partial<Search>) =>
    navigate({ to: "/admin/analytics", search: (p: Search) => ({ ...p, ...patch }), replace: true });

  // ---- data ----
  const kpis = useQuery(analyticsKpisQuery(filters));
  const tsSignups = useQuery(analyticsTimeseriesQuery(filters, "signups", bucket));
  const tsMatches = useQuery(analyticsTimeseriesQuery(filters, "matches", bucket));
  const tsMessages = useQuery(analyticsTimeseriesQuery(filters, "messages", bucket));
  const tsLikes = useQuery(analyticsTimeseriesQuery(filters, "likes", bucket));

  const distGender = useQuery(analyticsDistributionQuery("gender", filters.college, filters.department));
  const distVerification = useQuery(analyticsDistributionQuery("verification", filters.college, filters.department));
  const distCompletion = useQuery(analyticsDistributionQuery("completion", filters.college, filters.department));
  const distAge = useQuery(analyticsDistributionQuery("age", filters.college, filters.department));
  const distDept = useQuery(analyticsDistributionQuery("department", filters.college, filters.department));
  const distSemester = useQuery(analyticsDistributionQuery("semester", filters.college, filters.department));

  const lbUsers = useQuery(analyticsLeaderboardQuery("colleges_users"));
  const lbMatches = useQuery(analyticsLeaderboardQuery("colleges_matches"));
  const lbMessages = useQuery(analyticsLeaderboardQuery("colleges_messages"));
  const lbDept = useQuery(analyticsLeaderboardQuery("departments_users"));
  const lbGrowth = useQuery(analyticsLeaderboardQuery("colleges_growth"));

  const heatMessages = useQuery(analyticsHeatmapQuery(filters, "messages"));
  const heatSignups = useQuery(analyticsHeatmapQuery(filters, "signups"));

  const moderation = useQuery(analyticsModerationQuery(range.start, range.end));
  const activity = useQuery(adminActivityQuery(20));
  const health = useQuery(systemHealthQuery());

  // college / department filter options
  const colleges = useQuery(adminCollegesQuery({ search: "", sort: "name", limit: 100, offset: 0 }));
  const departments = useQuery(departmentsQuery(filters.college));

  const k = kpis.data;

  const handleExport = async (kind: "csv" | "xlsx") => {
    haptic("light");
    if (!k) return;
    const kpiRows = Object.entries(k).map(([metric, value]) => ({ metric, value }));
    const sheets = [
      { name: "KPIs", rows: kpiRows },
      { name: "Signups", rows: (tsSignups.data ?? []).map((p) => ({ bucket: p.bucket, signups: p.value })) },
      { name: "Matches", rows: (tsMatches.data ?? []).map((p) => ({ bucket: p.bucket, matches: p.value })) },
      { name: "Messages", rows: (tsMessages.data ?? []).map((p) => ({ bucket: p.bucket, messages: p.value })) },
      { name: "TopColleges", rows: (lbUsers.data ?? []).map((d) => ({ college: d.name, users: d.value })) },
    ];
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === "csv") {
      exportCSV(`coligo-analytics-kpis-${stamp}.csv`, kpiRows);
    } else {
      await exportXLSX(`coligo-analytics-${stamp}.xlsx`, sheets);
    }
  };

  return (
    <div style={{ padding: spacing[3], paddingBottom: spacing[9], maxWidth: 1200, margin: "0 auto" }}>
      <TopBar
        title="Analytics"
        onBack={() => navigate({ to: "/admin/dashboard" })}
        trailing={
          <div style={{ color: colors.primary }}><BarChart3 style={I} /></div>
        }
      />

      {/* Date presets */}
      <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[3], flexWrap: "wrap" }}>
        <CalendarDays style={{ width: 16, height: 16, color: colors.textMuted }} />
        {DATE_PRESETS.map((p) => (
          <Chip key={p.key} selected={preset === p.key} onClick={() => setSearch({ preset: p.key })}>
            {p.label}
          </Chip>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[2], flexWrap: "wrap" }}>
          <input
            type="date"
            value={search.from ?? ""}
            onChange={(e) => setSearch({ from: e.target.value })}
            style={dateInputStyle}
          />
          <span style={{ color: colors.textMuted }}>→</span>
          <input
            type="date"
            value={search.to ?? ""}
            onChange={(e) => setSearch({ to: e.target.value })}
            style={dateInputStyle}
          />
        </div>
      ) : null}
      <Text variant="caption" tone="muted" style={{ marginTop: spacing[1], display: "block" }}>
        {fmtRangeLabel(range)}
      </Text>

      {/* Filters */}
      <Card style={{ marginTop: spacing[3] }} padding={spacing[3]}>
        <div className="flex items-center" style={{ gap: spacing[2], marginBottom: spacing[2] }}>
          <FilterIcon style={{ width: 14, height: 14, color: colors.textMuted }} />
          <Text variant="overline" tone="muted">Filters</Text>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: spacing[2] }}>
          <Select
            label="College"
            value={search.college ?? ""}
            onChange={(v) => setSearch({ college: v || undefined, department: undefined })}
            options={[{ value: "", label: "All colleges" }, ...(colleges.data?.rows ?? []).map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Select
            label="Department"
            value={search.department ?? ""}
            onChange={(v) => setSearch({ department: v || undefined })}
            options={[{ value: "", label: "All departments" }, ...(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))]}
          />
          <Select
            label="Gender"
            value={search.gender ?? ""}
            onChange={(v) => setSearch({ gender: v || undefined })}
            options={[
              { value: "", label: "All genders" },
              { value: "man", label: "Men" },
              { value: "woman", label: "Women" },
            ]}
          />
          <Select
            label="Verification"
            value={search.verification ?? ""}
            onChange={(v) => setSearch({ verification: v || undefined })}
            options={[
              { value: "", label: "All statuses" },
              { value: "verified", label: "Verified" },
              { value: "pending", label: "Pending" },
              { value: "unverified", label: "Unverified" },
            ]}
          />
        </div>
        <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[3], flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => handleExport("csv")}>
            <Download style={{ width: 14, height: 14, marginRight: 6 }} /> Export CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExport("xlsx")}>
            <Download style={{ width: 14, height: 14, marginRight: 6 }} /> Export XLSX
          </Button>
          <Chip disabled>PDF · coming soon</Chip>
          <Chip disabled>Scheduled reports · coming soon</Chip>
        </div>
      </Card>

      {/* KPIs */}
      <SectionTitle icon={<Sparkles style={I} />} title="Platform KPIs" sub="Live totals for the selected range and filters." />
      {kpis.isLoading ? (
        <div style={grid()}>
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} style={{ height: 92, borderRadius: 16 }} />)}
        </div>
      ) : kpis.isError ? (
        <ErrorCard onRetry={() => kpis.refetch()} />
      ) : k ? (
        <div style={grid()}>
          <StatCard label="Total users" value={fmt(k.totalUsers)} icon={<Users style={I} />} />
          <StatCard label="Verified" value={fmt(k.verifiedUsers)} icon={<UserCheck style={I} />} />
          <StatCard label="Active (7d)" value={fmt(k.activeUsers)} icon={<Activity style={I} />} />
          <StatCard label="Online now" value={fmt(k.usersOnline)} icon={<Radio style={I} />} />
          <StatCard label="New today" value={fmt(k.newToday)} icon={<UserPlus style={I} />} />
          <StatCard label="New this week" value={fmt(k.newThisWeek)} icon={<UserPlus style={I} />} />
          <StatCard label="New this month" value={fmt(k.newThisMonth)} icon={<UserPlus style={I} />} />
          <StatCard label="New in range" value={fmt(k.newInRange)} icon={<UserPlus style={I} />} />
          <StatCard label="Colleges" value={fmt(k.totalColleges)} icon={<Building2 style={I} />} />
          <StatCard label="Departments" value={fmt(k.totalDepartments)} icon={<GraduationCap style={I} />} />
          <StatCard label="Swipes" value={fmt(k.totalSwipes)} icon={<Activity style={I} />} />
          <StatCard label="Likes" value={fmt(k.totalLikes)} icon={<ThumbsUp style={I} />} />
          <StatCard label="Passes" value={fmt(k.totalPasses)} icon={<ThumbsDown style={I} />} />
          <StatCard label="Matches" value={fmt(k.totalMatches)} icon={<Heart style={I} />} />
          <StatCard label="Match rate" value={`${k.matchRate}%`} icon={<Percent style={I} />} />
          <StatCard label="Messages" value={fmt(k.messages)} icon={<MessagesSquare style={I} />} />
          <StatCard label="Images shared" value={fmt(k.imagesShared)} icon={<ImageIcon style={I} />} />
          <StatCard label="Voice notes" value={fmt(k.voiceNotes)} icon={<Mic style={I} />} />
          <StatCard label="Active chats" value={fmt(k.activeConversations)} icon={<MessageCircle style={I} />} />
          <StatCard label="Reports" value={fmt(k.reports)} icon={<Flag style={I} />} />
          <StatCard label="Pending reports" value={fmt(k.reportsPending)} icon={<ShieldAlert style={I} />} />
          <StatCard label="Suspended" value={fmt(k.suspendedUsers)} icon={<ShieldAlert style={I} />} />
          <StatCard label="Banned" value={fmt(k.bannedUsers)} icon={<Ban style={I} />} />
          <StatCard label="DAU" value={fmt(k.dau)} icon={<Activity style={I} />} />
          <StatCard label="WAU" value={fmt(k.wau)} icon={<Activity style={I} />} />
          <StatCard label="MAU" value={fmt(k.mau)} icon={<Activity style={I} />} />
          <StatCard label="Avg completion" value={`${k.avgProfileCompletion}%`} icon={<Percent style={I} />} />
          <ComingSoonTile label="Avg session length" />
          <ComingSoonTile label="Notification CTR" />
        </div>
      ) : null}

      {/* Growth & engagement trends */}
      <SectionTitle icon={<Activity style={I} />} title="Trends" sub={`Bucketed by ${bucket}.`} />
      <div style={grid(280)}>
        <ChartSlot q={tsSignups}>
          <AreaTrend title="Registrations" data={(tsSignups.data ?? []) as never[]} xKey="bucket" series={[{ key: "value", label: "Signups" }]} />
        </ChartSlot>
        <ChartSlot q={tsMatches}>
          <AreaTrend title="Matches" data={(tsMatches.data ?? []) as never[]} xKey="bucket" series={[{ key: "value", label: "Matches", color: "#ff375f" }]} />
        </ChartSlot>
        <ChartSlot q={tsMessages}>
          <AreaTrend title="Messages" data={(tsMessages.data ?? []) as never[]} xKey="bucket" series={[{ key: "value", label: "Messages", color: "#5e5ce6" }]} />
        </ChartSlot>
        <ChartSlot q={tsLikes}>
          <AreaTrend title="Likes" data={(tsLikes.data ?? []) as never[]} xKey="bucket" series={[{ key: "value", label: "Likes", color: "#34c759" }]} />
        </ChartSlot>
      </div>

      {/* Distributions */}
      <SectionTitle icon={<Users style={I} />} title="User distribution" />
      <div style={grid(280)}>
        <ChartSlot q={distGender}><Donut title="Gender" data={(distGender.data ?? []).map((d) => ({ name: d.name, value: d.value }))} /></ChartSlot>
        <ChartSlot q={distVerification}><Donut title="Verification" data={(distVerification.data ?? []).map((d) => ({ name: d.name, value: d.value }))} /></ChartSlot>
        <ChartSlot q={distCompletion}><Donut title="Profile completion" data={(distCompletion.data ?? []).map((d) => ({ name: d.name, value: d.value }))} /></ChartSlot>
        <ChartSlot q={distAge}><BarSeries title="Age groups" data={(distAge.data ?? []) as never[]} xKey="name" dataKey="value" /></ChartSlot>
        <ChartSlot q={distDept}><BarSeries title="Top departments" data={(distDept.data ?? []) as never[]} xKey="name" dataKey="value" color="#5e5ce6" /></ChartSlot>
        <ChartSlot q={distSemester}><BarSeries title="Semester" data={(distSemester.data ?? []) as never[]} xKey="name" dataKey="value" color="#ff9f0a" /></ChartSlot>
      </div>

      {/* Leaderboards */}
      <SectionTitle icon={<GraduationCap style={I} />} title="Leaderboards" sub="Top performing colleges and departments." />
      <div style={grid(280)}>
        <ChartSlot q={lbUsers}><LeaderboardList title="Top colleges — users" data={lbUsers.data ?? []} unit="users" /></ChartSlot>
        <ChartSlot q={lbMatches}><LeaderboardList title="Top colleges — matches" data={lbMatches.data ?? []} unit="matches" /></ChartSlot>
        <ChartSlot q={lbMessages}><LeaderboardList title="Top colleges — messages" data={lbMessages.data ?? []} unit="msgs" /></ChartSlot>
        <ChartSlot q={lbDept}><LeaderboardList title="Top departments — users" data={lbDept.data ?? []} unit="users" /></ChartSlot>
        <ChartSlot q={lbGrowth}><LeaderboardList title="Fastest growing (30d)" data={lbGrowth.data ?? []} unit="new" /></ChartSlot>
      </div>

      {/* Heatmaps */}
      <SectionTitle icon={<Clock style={I} />} title="Activity heatmaps" sub="Day-of-week × hour, in your local time." />
      <div style={grid(360)}>
        <ChartSlot q={heatMessages}><Heatmap title="Messaging activity" data={heatMessages.data ?? []} /></ChartSlot>
        <ChartSlot q={heatSignups}><Heatmap title="Registration activity" data={heatSignups.data ?? []} /></ChartSlot>
      </div>

      {/* Moderation */}
      <SectionTitle icon={<ShieldAlert style={I} />} title="Moderation" />
      {moderation.data ? (
        <>
          <div style={grid()}>
            <StatCard label="Reports (range)" value={fmt(moderation.data.totalReports)} icon={<Flag style={I} />} />
            <StatCard label="Warnings" value={fmt(moderation.data.warnings)} icon={<ShieldAlert style={I} />} />
            <StatCard label="Suspensions" value={fmt(moderation.data.suspensions)} icon={<ShieldAlert style={I} />} />
            <StatCard label="Bans" value={fmt(moderation.data.bans)} icon={<Ban style={I} />} />
            <StatCard label="Avg resolution" value={`${moderation.data.avgResolutionHours}h`} icon={<Clock style={I} />} />
          </div>
          <div style={{ ...grid(280), marginTop: spacing[2] }}>
            <Donut title="Reports by category" data={moderation.data.byCategory} />
            <Donut title="Reports by status" data={moderation.data.byStatus} />
            <LeaderboardList title="Repeat offenders" data={moderation.data.repeatOffenders} unit="reports" />
          </div>
        </>
      ) : moderation.isLoading ? (
        <Skeleton style={{ height: 120, borderRadius: 16 }} />
      ) : null}

      {/* Live activity + system */}
      <div style={{ ...grid(340), marginTop: spacing[3] }}>
        <Card>
          <Text variant="overline" tone="muted">Live activity feed</Text>
          <div style={{ marginTop: spacing[2], display: "flex", flexDirection: "column", gap: spacing[2] }}>
            {(activity.data ?? []).length === 0 ? (
              <Text variant="caption" tone="muted">No recent activity.</Text>
            ) : (
              (activity.data ?? []).map((e: ActivityEvent) => (
                <div key={e.id} className="flex items-center justify-between" style={{ gap: spacing[2] }}>
                  <Text variant="bodySm" color={colors.textPrimary} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.title}
                  </Text>
                  <Text variant="caption" tone="muted" style={{ flexShrink: 0 }}>
                    {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <Text variant="overline" tone="muted">System health</Text>
          <div style={{ marginTop: spacing[2], display: "flex", flexDirection: "column", gap: spacing[2] }}>
            <HealthRow label="Database" ok={health.data?.database} />
            <HealthRow label="Realtime" ok={health.data?.realtime} />
            <HealthRow label="Storage" ok={health.data?.storage} />
            <HealthRow label="Authentication" ok={health.data?.auth} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- helpers
const dateInputStyle: React.CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${surfaces.border}`,
  padding: "8px 10px",
  fontSize: 13,
  color: colors.textPrimary,
  background: surfaces.glassSoft,
};

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderRadius: 10,
          border: `1px solid ${surfaces.border}`,
          padding: "8px 10px",
          fontSize: 13,
          color: colors.textPrimary,
          background: surfaces.glassSoft,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function ComingSoonTile({ label }: { label: string }) {
  return (
    <Card style={{ opacity: 0.7 }}>
      <div className="flex items-start justify-between" style={{ gap: spacing[2] }}>
        <Text variant="overline" tone="muted">{label}</Text>
        <Lock style={{ width: 14, height: 14, color: colors.textMuted }} />
      </div>
      <div style={{ marginTop: spacing[2] }}>
        <Text variant="body" tone="muted">Coming soon</Text>
      </div>
    </Card>
  );
}

function ChartSlot({ q, children }: { q: { isLoading: boolean; isError: boolean; refetch: () => void }; children: React.ReactNode }) {
  if (q.isLoading) return <Skeleton style={{ height: 240, borderRadius: 16 }} />;
  if (q.isError) return <ErrorCard onRetry={() => q.refetch()} />;
  return <>{children}</>;
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyStateCard
      title="Couldn't load this widget"
      description="Something went wrong fetching this data."
      action={<Button variant="secondary" onClick={onRetry}>Retry</Button>}
    />
  );
}

function HealthRow({ label, ok }: { label: string; ok?: boolean }) {
  const color = ok == null ? colors.textMuted : ok ? colors.success : colors.danger;
  return (
    <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
      <Text variant="bodySm" color={colors.textPrimary}>{label}</Text>
      <span className="inline-flex items-center" style={{ gap: 6, color }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        <Text variant="caption" style={{ color }}>{ok == null ? "…" : ok ? "Operational" : "Down"}</Text>
      </span>
    </div>
  );
}
