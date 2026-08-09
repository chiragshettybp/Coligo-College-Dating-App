// ============================================================================
// /home — personalized dashboard. Every figure is live Supabase data; online
// counts come from realtime presence and announcements refresh in realtime.
// Composed entirely from the /ui design system. Mobile-first vertical scroll.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Settings,
  GraduationCap,
  Users,
  Heart,
  Flame,
  ChevronRight,
  TrendingUp,
  Trophy,
  Zap,
  Megaphone,
  
  Building2,
  UserRound,
  MessageCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  homeDashboardQuery,
  type HomeDashboard,
  type GenderMap,
  type Announcement,
} from "@/lib/home.functions";
import { useOnlinePresence } from "@/lib/use-online-presence";
import { useNotificationsRealtime, useUnreadNotifications } from "@/lib/use-notifications";
import {
  APP_BACKGROUND,
  FONT_FAMILY,
  colors,
  spacing,
  radii,
  gradients,
  shadows,
  surfaces,
} from "@/lib/ds";
import { Text, Avatar, Button, Badge, Skeleton } from "@/components/ds/glass";
import chiragAvatar from "@/assets/chirag-avatar.png.asset.json";
import { Card, CardHeader, StatCard } from "@/components/ds/card";
import {
  BottomNav,
  BottomSheet,
  NavIconButton,
  type BottomNavItem,
} from "@/components/ds/navigation";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";

export const Route = createFileRoute("/_authenticated/home/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeDashboardQuery()),
  pendingComponent: HomeSkeleton,
  errorComponent: HomeError,
  component: HomeDashboardPage,
});

/* --------------------------------------------------------------- helpers -- */

function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function genderSummary(g: GenderMap): { label: string; parts: { key: string; count: number }[] } {
  const entries = Object.entries(g).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return { label: "No data yet", parts: [] };
  const women = g["female"] ?? 0;
  const men = g["male"] ?? 0;
  const label =
    women + men > 0
      ? `${Math.round((women / (women + men)) * 100)}% / ${Math.round((men / (women + men)) * 100)}% W·M`
      : `${total} members`;
  return { label, parts: entries.map(([key, count]) => ({ key, count })) };
}

function nfmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

/* ------------------------------------------------------------ section head - */

function SectionHead({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: spacing[2] }}>
      <Text variant="headingSm" color={colors.textPrimary}>
        {title}
      </Text>
      {actionLabel && (
        <button
          onClick={onAction}
          className="ds-press inline-flex items-center"
          style={{
            gap: 2,
            color: colors.primary,
            background: "transparent",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {actionLabel}
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- page ----- */

function HomeDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(homeDashboardQuery());
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [openAnn, setOpenAnn] = useState<Announcement | null>(null);

  const online = useOnlinePresence(data.profile.id, data.profile.collegeId);

  // Live unread notification count for the header bell, kept fresh by realtime.
  useNotificationsRealtime(data.profile.id);
  const unread = useUnreadNotifications();

  // Realtime: refresh dashboard when announcements or college data change.
  useEffect(() => {
    const channel = supabase
      .channel("home:dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        queryClient.invalidateQueries({ queryKey: ["home", "dashboard"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "colleges" }, () => {
        queryClient.invalidateQueries({ queryKey: ["home", "dashboard"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Note: refetch-on-focus is handled globally by the QueryClient
  // (refetchOnWindowFocus: true), so no manual focus listener is needed here —
  // adding one would double-fetch the dashboard on every tab refocus.



  const navItems: BottomNavItem[] = useMemo(
    () => [
      { icon: (p) => <Heart {...p} fill="currentColor" />, label: "Home" },
      { icon: (p) => <Flame {...p} />, label: "Discover" },
      { icon: (p) => <MessageCircle {...p} />, label: "Chat" },
      { icon: (p) => <UserRound {...p} />, label: "Profile" },
    ],
    [],
  );

  const gs = data.college ? genderSummary(data.college.gender) : null;

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: APP_BACKGROUND,
        fontFamily: FONT_FAMILY,
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <main
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: `${spacing[4]}px ${spacing[4]}px ${spacing[9] + 64}px`,
          display: "flex",
          flexDirection: "column",
          gap: spacing[5],
        }}
      >
        {/* Header */}
        <header className="flex items-center justify-between" style={{ gap: spacing[2] }}>
          <button
            onClick={() => setComingSoon("Profile")}
            className="ds-press flex items-center"
            style={{ gap: spacing[2], background: "transparent" }}
            aria-label="Open profile"
          >
            <div style={{ position: "relative" }}>
              <Avatar
                src={data.profile.avatarUrl ?? undefined}
                initials={(data.profile.firstName ?? "U").slice(0, 1).toUpperCase()}
                size="md"
                ring
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: colors.success,
                  border: `2px solid ${APP_BACKGROUND}`,
                }}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <Text variant="caption" tone="muted">
                {greeting()}
              </Text>
              <div style={{ display: "flex", alignItems: "center", gap: spacing[1] }}>
                <Text variant="headingSm" color={colors.textPrimary}>
                  {data.profile.firstName}
                </Text>
                <div 
                  style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: "50%", 
                    background: colors.success,
                    marginTop: 1
                  }} 
                />
              </div>
            </div>
          </button>
          <div className="flex items-center" style={{ gap: spacing[0] }}>
            <NavIconButton
              label="Notifications"
              badge={unread || undefined}
              onClick={() => navigate({ to: "/notifications" })}
            >
              <Bell style={{ width: 22, height: 22 }} />
            </NavIconButton>
            <NavIconButton label="Settings" onClick={() => setComingSoon("Settings")}>
              <Settings style={{ width: 22, height: 22 }} />
            </NavIconButton>
          </div>
        </header>

        {/* Live activity: online + matches today */}
        <section className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
          <StatCard
            label="Online now"
            value={nfmt(online.national)}
            delta={online.connected ? `${nfmt(online.college)} at your college` : "Reconnecting…"}
            deltaTone={online.connected ? "up" : "neutral"}
            icon={<Users style={{ width: 18, height: 18 }} />}
          />
          <div
            onClick={() => navigate({ to: "/matches" })}
            className="ds-press"
            style={{ cursor: "pointer" }}
          >
            <StatCard
              label="Matches today"
              value={nfmt(data.matches.total)}
              delta={
                data.matches.mine > 0 ? `${data.matches.mine} of them yours` : "Make your first"
              }
              deltaTone={data.matches.mine > 0 ? "up" : "neutral"}
              icon={<Heart style={{ width: 18, height: 18 }} />}
            />
          </div>
        </section>

        {/* Rankings preview */}
        <section>
          <SectionHead
            title="College rankings"
            actionLabel="View all"
            onAction={() => navigate({ to: "/home/college-rankings" })}
          />
          {data.rankingsPreview.length > 0 ? (
            <Card padding={0}>
              {data.rankingsPreview.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() =>
                    navigate({ to: "/home/college/$collegeId", params: { collegeId: r.id } })
                  }
                  className="ds-press flex w-full items-center"
                  style={{
                    gap: spacing[2],
                    padding: spacing[3],
                    background: "transparent",
                    borderTop: i === 0 ? "none" : `1px solid ${surfaces.borderSoft}`,
                    textAlign: "left",
                  }}
                >
                  <Text
                    variant="headingSm"
                    color={i === 0 ? colors.warning : colors.textMuted}
                    style={{ width: 28 }}
                    numeric
                  >
                    {r.rank}
                  </Text>
                  <div className="min-w-0 flex-1">
                    <Text variant="title" color={colors.textPrimary} truncate>
                      {r.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {nfmt(r.memberCount)} students
                    </Text>
                  </div>
                  {r.growth30d > 0 && (
                    <span
                      className="inline-flex items-center"
                      style={{ gap: 2, color: colors.success, fontSize: 13, fontWeight: 600 }}
                    >
                      <TrendingUp style={{ width: 14, height: 14 }} /> +{nfmt(r.growth30d)}
                    </span>
                  )}
                </button>
              ))}
            </Card>
          ) : (
            <Card>
              <Text variant="body" tone="secondary">
                Rankings will appear as students join.
              </Text>
            </Card>
          )}
        </section>

        {/* New members */}
        <section>
          <SectionHead title="New members" />
          {data.newMembers.length > 0 ? (
            <div
              className="flex overflow-x-auto"
              style={{ gap: spacing[3], scrollbarWidth: "none", padding: "2px" }}
            >
              {data.newMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate({ to: "/discover/profile/$userId", params: { userId: m.id } })}
                  className="ds-press flex flex-col items-center shrink-0"
                  style={{ width: 76, background: "transparent" }}
                >
                  <Avatar
                    src={m.avatarUrl ?? undefined}
                    initials={(m.name ?? "?").slice(0, 1).toUpperCase()}
                    size="lg"
                    ring
                  />
                  <Text
                    variant="caption"
                    color={colors.textPrimary}
                    truncate
                    style={{ marginTop: spacing[1], maxWidth: 76 }}
                  >
                    {m.name?.split(" ")[0] ?? "Member"}
                  </Text>
                </button>
              ))}
            </div>
          ) : (
            <Card>
              <Text variant="body" tone="secondary">
                New verified students will show up here.
              </Text>
            </Card>
          )}
        </section>

        {/* Quick stats */}
        <section>
          <SectionHead title="On Coligo" />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
            <StatCard
              label="Verified students"
              value={nfmt(data.platform.totalStudents)}
              icon={<GraduationCap style={{ width: 18, height: 18 }} />}
            />
            <StatCard
              label="Colleges"
              value={nfmt(data.platform.participatingColleges)}
              icon={<Building2 style={{ width: 18, height: 18 }} />}
            />
            <StatCard
              label="Active today"
              value={nfmt(data.platform.activeUsers)}
              icon={<Zap style={{ width: 18, height: 18 }} />}
            />
            <StatCard
              label="Matches today"
              value={nfmt(data.platform.matchesToday)}
              icon={<Heart style={{ width: 18, height: 18 }} />}
            />
          </div>
        </section>

        </main>
      </div>

      {/* Bottom navigation */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: `0 ${spacing[4]}px ${spacing[3]}px`,
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", pointerEvents: "auto" }}>
          <BottomNav
            items={navItems}
            active={0}
            onChange={(i) => {
              if (i === 1) navigate({ to: "/discover" });
              else if (i === 2) navigate({ to: "/chat" });
              else if (i === 3) navigate({ to: "/profile" });
            }}
          />
        </div>
      </div>

      {/* Announcement detail */}
      <BottomSheet open={openAnn != null} onClose={() => setOpenAnn(null)} title={openAnn?.title}>
        <Text
          variant="body"
          tone="secondary"
          style={{ whiteSpace: "pre-wrap", marginTop: spacing[2] }}
        >
          {openAnn?.body}
        </Text>
        <Button
          variant="secondary"
          fullWidth
          style={{ marginTop: spacing[5] }}
          onClick={() => setOpenAnn(null)}
        >
          Close
        </Button>
      </BottomSheet>

      {/* Coming-soon for modules not yet built */}
      <BottomSheet
        open={comingSoon != null}
        onClose={() => setComingSoon(null)}
        title={`${comingSoon ?? ""} — coming soon`}
      >
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
          The {comingSoon} experience is on its way. It will plug into this dashboard using your
          current session.
        </Text>
        <Button
          variant="primary"
          fullWidth
          style={{ marginTop: spacing[5] }}
          onClick={() => setComingSoon(null)}
        >
          Got it
        </Button>
      </BottomSheet>
    </div>
  );
}

/* ------------------------------------------------------- pending / error -- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        backgroundAttachment: "fixed",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: spacing[4],
          display: "flex",
          flexDirection: "column",
          gap: spacing[4],
        }}
      >
        {children}
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <Shell>
      <div className="flex items-center" style={{ gap: spacing[2] }}>
        <Skeleton style={{ width: 52, height: 52, borderRadius: 999 }} />
        <div style={{ flex: 1 }}>
          <Skeleton style={{ width: 120, height: 12 }} />
          <Skeleton style={{ width: 160, height: 20, marginTop: 8 }} />
        </div>
      </div>
      <Skeleton style={{ height: 120, borderRadius: radii.lg }} />
      <Skeleton style={{ height: 150, borderRadius: radii.lg }} />
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
        <Skeleton style={{ height: 110, borderRadius: radii.lg }} />
        <Skeleton style={{ height: 110, borderRadius: radii.lg }} />
      </div>
      <Skeleton style={{ height: 220, borderRadius: radii.lg }} />
    </Shell>
  );
}

function HomeError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const onRetry = () => {
    router.invalidate();
    reset();
  };
  return (
    <Shell>
      <EmptyStateFromPreset preset="offline" onPrimary={onRetry} />
    </Shell>
  );
}
