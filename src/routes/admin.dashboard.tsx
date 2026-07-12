// ============================================================================
// /admin/dashboard — realtime platform overview. All data is queried from
// Supabase through admin-gated server functions. Non-admins (and signed-out
// visitors) are redirected to /admin/login. Cards, charts and the activity
// feed refresh live via Supabase Realtime.
// ============================================================================
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
  Flag,
  Ban,
  Trash2,
  Search as SearchIcon,
  LogOut,
  Sparkles,
  BellRing,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  adminStatsQuery,
  adminTimeseriesQuery,
  adminDistributionQuery,
  adminActivityQuery,
  systemHealthQuery,
  adminGuardQuery,
  adminSearch,
  logAdminAction,
  type AdminStats,
  type ActivityEvent,
} from "@/lib/admin.functions";
import { useAdminRealtime } from "@/lib/use-admin-realtime";
import { Text, Button, Badge, Skeleton } from "@/components/ds/glass";
import { Card, StatCard, SettingsCard, SettingsRow } from "@/components/ds/card";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { AreaTrend, BarSeries, Donut } from "@/components/admin/charts";
import { colors, radii, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const I = { width: 16, height: 16 } as const;

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Coligo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboardGuard,
});

// -------------------------------------------------------------------- guard
function AdminDashboardGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError } = useQuery(adminGuardQuery());

  useEffect(() => {
    if (isLoading) return;
    if (isError || allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, isError, allowed, navigate]);

  if (isLoading) return <DashboardSkeleton />;
  if (!allowed) return null;
  return <AdminDashboard />;
}

// ---------------------------------------------------------------- dashboard
function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  useAdminRealtime(true);

  const stats = useQuery(adminStatsQuery());
  const series = useQuery(adminTimeseriesQuery(14));
  const dist = useQuery(adminDistributionQuery());
  const activity = useQuery(adminActivityQuery(20));
  const health = useQuery(systemHealthQuery());

  const onLogout = async () => {
    haptic("light");
    try {
      await logAdminAction({ data: { action: "admin_logout" } });
    } catch {
      /* ignore */
    }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  const timeseries = (series.data ?? []).map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
  }));

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar
        title="Admin Dashboard"
        trailing={
          <button
            onClick={onLogout}
            aria-label="Sign out"
            style={{ display: "flex", padding: 8, color: colors.textSecondary, background: "transparent", border: "none", cursor: "pointer" }}
          >
            <LogOut style={{ width: 20, height: 20 }} />
          </button>
        }
      />

      <div style={{ marginTop: spacing[4] }}>
        <SystemStatus data={health.data} loading={health.isLoading} />
      </div>

      {/* Search */}
      <div style={{ marginTop: spacing[4] }}>
        <AdminSearchBox />
      </div>

      {/* Overview cards */}
      <SectionTitle icon={<Activity style={{ width: 16, height: 16 }} />} title="Platform overview" />
      {stats.isLoading || !stats.data ? (
        <StatGridSkeleton />
      ) : (
        <StatGrid stats={stats.data} />
      )}

      {/* Charts */}
      <SectionTitle icon={<Sparkles style={{ width: 16, height: 16 }} />} title="Activity trends" />
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: spacing[3] }}>
        {series.isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <AreaTrend
              title="Signups & active users"
              subtitle="Last 14 days"
              data={timeseries}
              xKey="label"
              series={[
                { key: "signups", label: "Signups", color: colors.primary },
                { key: "activeUsers", label: "Active", color: "#34c759" },
              ]}
            />
            <AreaTrend
              title="Matches & messages"
              subtitle="Last 14 days"
              data={timeseries}
              xKey="label"
              series={[
                { key: "matches", label: "Matches", color: "#ff375f" },
                { key: "messages", label: "Messages", color: "#5e5ce6" },
              ]}
            />
          </>
        )}

        {!dist.isLoading && dist.data ? (
          <>
            <Donut
              title="Gender distribution"
              data={Object.entries(dist.data.gender).map(([name, value]) => ({ name: prettyGender(name), value: Number(value) }))}
            />
            <BarSeries
              title="Top colleges"
              subtitle="By member count"
              data={dist.data.topColleges}
              xKey="name"
              dataKey="count"
              color={colors.primary}
            />
            <BarSeries
              title="Departments"
              subtitle="Top 8 by members"
              data={dist.data.departments}
              xKey="name"
              dataKey="count"
              color="#5e5ce6"
            />
            <Donut
              title="Profile completion"
              data={[
                { name: "Completed", value: dist.data.profileCompletion.completed },
                { name: "Incomplete", value: dist.data.profileCompletion.incomplete },
              ]}
            />
          </>
        ) : (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        )}
      </div>

      {/* Recent activity + quick actions */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: spacing[3], marginTop: spacing[4] }}>
        <div>
          <SectionTitle icon={<BellRing style={{ width: 16, height: 16 }} />} title="Recent activity" />
          <RecentActivity events={activity.data} loading={activity.isLoading} />
        </div>
        <div>
          <SectionTitle icon={<Sparkles style={{ width: 16, height: 16 }} />} title="Quick actions" />
          <QuickActions pending={stats.data?.reportsPending ?? 0} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- system status
function SystemStatus({ data, loading }: { data?: { database: boolean; realtime: boolean; storage: boolean; auth: boolean }; loading: boolean }) {
  const items: { label: string; ok?: boolean }[] = [
    { label: "Database", ok: data?.database },
    { label: "Realtime", ok: data?.realtime },
    { label: "Storage", ok: data?.storage },
    { label: "Auth", ok: data?.auth },
  ];
  return (
    <Card padding={spacing[3]}>
      <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
        <Text variant="overline" tone="muted" style={{ marginRight: 4 }}>System status</Text>
        {items.map((it) => (
          <Badge key={it.label} tone={loading ? "neutral" : it.ok ? "success" : "danger"} dot pulse={!loading && it.ok}>
            {it.label}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------- search
function AdminSearchBox() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["admin", "search", debounced],
    queryFn: () => adminSearch({ data: { q: debounced } }),
    enabled: debounced.trim().length >= 2,
  });

  const hasResults =
    data && (data.users.length > 0 || data.colleges.length > 0 || data.reports.length > 0);

  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Search users, colleges, reports…" icon={<SearchIcon style={{ width: 16, height: 16 }} />} />
      {debounced.trim().length >= 2 ? (
        <Card style={{ marginTop: spacing[2] }} padding={spacing[3]}>
          {isFetching && !data ? (
            <Text variant="caption" tone="muted">Searching…</Text>
          ) : hasResults ? (
            <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
              {data!.users.map((u) => (
                <ResultRow key={`u-${u.id}`} label={u.name ?? u.phone ?? "User"} sub={`User · ${u.status}`} />
              ))}
              {data!.colleges.map((c) => (
                <ResultRow key={`c-${c.id}`} label={c.name} sub={`College${c.city ? ` · ${c.city}` : ""}`} />
              ))}
              {data!.reports.map((r) => (
                <ResultRow key={`r-${r.id}`} label={r.reason} sub={`Report · ${r.status}`} />
              ))}
            </div>
          ) : (
            <Text variant="caption" tone="muted">No matches found.</Text>
          )}
        </Card>
      ) : null}
    </div>
  );
}

function ResultRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
      <div style={{ minWidth: 0 }}>
        <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{label}</Text>
        <Text variant="caption" tone="muted">{sub}</Text>
      </div>
      <ChevronRight style={{ width: 16, height: 16, color: colors.textMuted, flexShrink: 0 }} />
    </div>
  );
}

// ----------------------------------------------------------------- stat grid
function StatGrid({ stats }: { stats: AdminStats }) {
  const cards: { label: string; value: number; icon: React.ReactNode }[] = [
    { label: "Total users", value: stats.totalUsers, icon: <Users style={I} /> },
    { label: "Verified", value: stats.verifiedUsers, icon: <UserCheck style={I} /> },
    { label: "Active today", value: stats.activeToday, icon: <Activity style={I} /> },
    { label: "Online now", value: stats.usersOnline, icon: <Radio style={I} /> },
    { label: "New today", value: stats.newToday, icon: <UserPlus style={I} /> },
    { label: "Women", value: stats.femaleUsers, icon: <Users style={I} /> },
    { label: "Men", value: stats.maleUsers, icon: <Users style={I} /> },
    { label: "Colleges", value: stats.totalColleges, icon: <Building2 style={I} /> },
    { label: "Departments", value: stats.totalDepartments, icon: <GraduationCap style={I} /> },
    { label: "Total swipes", value: stats.totalSwipes, icon: <Activity style={I} /> },
    { label: "Likes", value: stats.totalLikes, icon: <ThumbsUp style={I} /> },
    { label: "Passes", value: stats.totalPasses, icon: <ThumbsDown style={I} /> },
    { label: "Matches", value: stats.totalMatches, icon: <Heart style={I} /> },
    { label: "Matches today", value: stats.matchesToday, icon: <Heart style={I} /> },
    { label: "Messages today", value: stats.messagesToday, icon: <MessageCircle style={I} /> },
    { label: "Conversations", value: stats.totalConversations, icon: <MessagesSquare style={I} /> },
    { label: "Images", value: stats.imagesUploaded, icon: <ImageIcon style={I} /> },
    { label: "Reports pending", value: stats.reportsPending, icon: <Flag style={I} /> },
    { label: "Blocked users", value: stats.blockedUsers, icon: <Ban style={I} /> },
    { label: "Deleted accounts", value: stats.deletedAccounts, icon: <Trash2 style={I} /> },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[3] }}>
      {cards.map((c) => (
        <StatCard key={c.label} label={c.label} value={c.value.toLocaleString()} icon={c.icon} />
      ))}
    </div>
  );
}

// -------------------------------------------------------------- recent feed
const ACTIVITY_META: Record<ActivityEvent["type"], { icon: React.ReactNode; tone: string; label: string }> = {
  registration: { icon: <UserPlus style={I} />, tone: colors.primary, label: "Registration" },
  match: { icon: <Heart style={I} />, tone: "#ff375f", label: "Match" },
  message: { icon: <MessageCircle style={I} />, tone: "#5e5ce6", label: "Message" },
  report: { icon: <Flag style={I} />, tone: colors.warning, label: "Report" },
  block: { icon: <Ban style={I} />, tone: colors.danger, label: "Block" },
  admin_action: { icon: <ShieldAlert style={I} />, tone: colors.textSecondary, label: "Admin" },
};

function RecentActivity({ events, loading }: { events?: ActivityEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <Card padding={spacing[3]}>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center" style={{ gap: spacing[2] }}>
              <Skeleton style={{ width: 32, height: 32, borderRadius: 999 }} />
              <Skeleton style={{ height: 14, flex: 1 }} />
            </div>
          ))}
        </div>
      </Card>
    );
  }
  if (!events || events.length === 0) {
    return (
      <Card padding={spacing[4]}>
        <Text variant="body" tone="muted">No recent activity yet.</Text>
      </Card>
    );
  }
  return (
    <Card padding={spacing[3]}>
      <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
        {events.map((e) => {
          const m = ACTIVITY_META[e.type];
          return (
            <div key={`${e.type}-${e.id}`} className="flex items-center" style={{ gap: spacing[2] }}>
              <span
                style={{
                  display: "flex",
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  color: m.tone,
                  background: "rgba(120,120,128,0.08)",
                  flexShrink: 0,
                }}
              >
                {m.icon}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text variant="body" color={colors.textPrimary} truncate style={{ fontWeight: 600 }}>
                  {e.title}
                </Text>
                <Text variant="caption" tone="muted">{m.label} · {timeAgo(e.ts)}</Text>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- quick actions
const ACTIONS: { label: string; icon: React.ReactNode; badge?: boolean }[] = [
  { label: "Manage Users", icon: <Users style={I} /> },
  { label: "Manage Colleges", icon: <Building2 style={I} /> },
  { label: "Manage Reports", icon: <Flag style={I} />, badge: true },
  { label: "Manage Chats", icon: <MessagesSquare style={I} /> },
  { label: "Analytics", icon: <Activity style={I} /> },
  { label: "Audit Logs", icon: <ShieldAlert style={I} /> },
];

function QuickActions({ pending }: { pending: number }) {
  return (
    <SettingsCard>
      {ACTIONS.map((a) => (
        <SettingsRow
          key={a.label}
          leading={<span style={{ color: colors.primary, display: "flex" }}>{a.icon}</span>}
          title={a.label}
          chevron={!(a.badge && pending > 0)}
          trailing={a.badge && pending > 0 ? <Badge tone="danger">{pending}</Badge> : undefined}
          onClick={() => {
            /* future module — dashboard entry point */
          }}
        />
      ))}
    </SettingsCard>
  );
}

// ----------------------------------------------------------------- helpers


function prettyGender(g: string) {
  if (g === "man") return "Men";
  if (g === "woman") return "Women";
  if (g === "nonbinary") return "Non-binary";
  if (g === "unspecified") return "Unspecified";
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ------------------------------------------------------------- section title
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center" style={{ gap: spacing[2], margin: `${spacing[5]}px 0 ${spacing[3]}px`, color: colors.textSecondary }}>
      {icon}
      <Text variant="headingSm" color={colors.textPrimary}>{title}</Text>
    </div>
  );
}

// ----------------------------------------------------------------- skeletons
function StatGridSkeleton() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[3] }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Card key={i}>
          <Skeleton style={{ height: 12, width: "60%" }} />
          <Skeleton style={{ height: 26, width: "50%", marginTop: 12 }} />
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <Skeleton style={{ height: 12, width: "40%" }} />
      <Skeleton style={{ height: 200, marginTop: 12, borderRadius: radii.md }} />
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4] }}>
      <Skeleton style={{ height: 52, borderRadius: radii.lg }} />
      <div style={{ marginTop: spacing[4] }}>
        <StatGridSkeleton />
      </div>
    </div>
  );
}
