// ============================================================================
// /home/college/:collegeId — full college profile with aggregated statistics.
// All figures are live Supabase data (SECURITY DEFINER aggregates); online
// count is realtime presence. Handles invalid / deleted colleges gracefully.
// ============================================================================
import { createFileRoute, useRouter, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Users, GraduationCap, Trophy, Building2, Sparkles, Wifi } from "lucide-react";

import { collegeDetailQuery, type CollegeDetail } from "@/lib/home.functions";
import { myProfileQuery } from "@/lib/profile.functions";
import { useOnlinePresence } from "@/lib/use-online-presence";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, surfaces, gradients } from "@/lib/ds";
import { Text, Avatar, Badge, Chip, Skeleton } from "@/components/ds/glass";
import { Card, CardHeader, StatCard } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState, EmptyStateFromPreset } from "@/components/ds/empty-state";

export const Route = createFileRoute("/_authenticated/home/college/$collegeId")({
  loader: async ({ context, params }) => {
    const detail = await context.queryClient.ensureQueryData(collegeDetailQuery(params.collegeId));
    if (!detail) throw notFound();
    return detail;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — CampusMatch` : "College — CampusMatch" },
      {
        name: "description",
        content: loaderData
          ? `${loaderData.name}: ${loaderData.memberCount} verified students on CampusMatch.`
          : "College profile on CampusMatch.",
      },
    ],
  }),
  pendingComponent: DetailSkeleton,
  errorComponent: DetailError,
  notFoundComponent: DetailNotFound,
  component: CollegeDetailPage,
});

function nfmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

function DistributionBar({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="flex flex-col" style={{ gap: spacing[2] }}>
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <Text variant="bodySm" color={colors.textPrimary} truncate>
              {it.label}
            </Text>
            <Text variant="caption" tone="muted" numeric>
              {it.count}
            </Text>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: radii.pill,
              background: "rgba(120,120,128,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(it.count / max) * 100}%`,
                height: "100%",
                borderRadius: radii.pill,
                background: gradients.primaryButton,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CollegeDetailPage() {
  const router = useRouter();
  const { collegeId } = Route.useParams();
  const { data } = useSuspenseQuery(collegeDetailQuery(collegeId));
  const { data: me } = useSuspenseQuery(myProfileQuery());
  const online = useOnlinePresence(me?.id ?? null, collegeId);

  const college = data as CollegeDetail; // loader guarantees non-null

  const genderItems = Object.entries(college.gender)
    .filter(([, v]) => v > 0)
    .map(([label, count]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), count }));

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
          padding: `${spacing[4]}px ${spacing[4]}px ${spacing[8]}px`,
          display: "flex",
          flexDirection: "column",
          gap: spacing[4],
        }}
      >
        <TopBar title="College" onBack={() => router.history.back()} />

        {/* Banner + identity */}
        <Card padding={0}>
          <div
            style={{
              position: "relative",
              height: 120,
              background: college.bannerUrl ? undefined : gradients.primaryButton,
            }}
          >
            {college.bannerUrl && (
              <img
                src={college.bannerUrl}
                alt=""
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
          </div>
          <div style={{ padding: spacing[4], marginTop: -44 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: radii.lg,
                overflow: "hidden",
                border: "3px solid #fff",
                background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              {college.logoUrl ? (
                <img
                  src={college.logoUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  className="inline-flex h-full w-full items-center justify-center"
                  style={{ background: "rgba(10,132,255,0.10)", color: colors.primary }}
                >
                  <GraduationCap style={{ width: 34, height: 34 }} />
                </span>
              )}
            </div>
            <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[2] }}>
              {college.name}
            </Text>
            {college.city && (
              <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
                {college.city}
              </Text>
            )}
            <div
              className="flex flex-wrap items-center"
              style={{ gap: spacing[1], marginTop: spacing[3] }}
            >
              {college.rank != null && (
                <Badge tone="warning">
                  <Trophy style={{ width: 12, height: 12 }} /> Rank #{college.rank}
                </Badge>
              )}
              <Badge tone="success" dot pulse={online.connected}>
                <Wifi style={{ width: 12, height: 12 }} /> {nfmt(online.college)} online
              </Badge>
            </div>
            {college.description && (
              <Text variant="body" tone="secondary" style={{ marginTop: spacing[3] }}>
                {college.description}
              </Text>
            )}
          </div>
        </Card>

        {/* Key stats */}
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
          <StatCard
            label="Verified students"
            value={nfmt(college.memberCount)}
            icon={<Users style={{ width: 18, height: 18 }} />}
          />
          <StatCard
            label="Departments"
            value={nfmt(college.departmentCount)}
            icon={<Building2 style={{ width: 18, height: 18 }} />}
          />
        </div>

        {/* Gender split */}
        {genderItems.length > 0 && (
          <Card>
            <CardHeader title="Gender balance" />
            <div style={{ marginTop: spacing[3] }}>
              <DistributionBar items={genderItems} />
            </div>
          </Card>
        )}

        {/* Departments */}
        {college.departments.length > 0 && (
          <Card>
            <CardHeader title="Departments" />
            <div style={{ marginTop: spacing[3] }}>
              <DistributionBar
                items={college.departments.map((d) => ({ label: d.name, count: d.count }))}
              />
            </div>
          </Card>
        )}

        {/* Graduation years */}
        {college.gradYears.length > 0 && (
          <Card>
            <CardHeader title="Graduation years" />
            <div style={{ marginTop: spacing[3] }}>
              <DistributionBar
                items={college.gradYears.map((g) => ({ label: String(g.year), count: g.count }))}
              />
            </div>
          </Card>
        )}

        {/* Top interests */}
        {college.topInterests.length > 0 && (
          <Card>
            <CardHeader
              title="Top interests"
              leading={<Sparkles style={{ width: 20, height: 20, color: colors.primary }} />}
            />
            <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[3] }}>
              {college.topInterests.map((it) => (
                <Chip key={it.name}>
                  {it.name} · {it.count}
                </Chip>
              ))}
            </div>
          </Card>
        )}

        {college.memberCount === 0 && (
          <EmptyState
            scene="college"
            tone="primary"
            title="No students yet"
            description="This college doesn't have verified students on CampusMatch yet. Be the one to start its community."
          />
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- states -------- */

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

function DetailSkeleton() {
  return (
    <Shell>
      <Skeleton style={{ height: 44, borderRadius: radii.lg }} />
      <Skeleton style={{ height: 220, borderRadius: radii.lg }} />
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
        <Skeleton style={{ height: 110, borderRadius: radii.lg }} />
        <Skeleton style={{ height: 110, borderRadius: radii.lg }} />
      </div>
      <Skeleton style={{ height: 160, borderRadius: radii.lg }} />
    </Shell>
  );
}

function DetailError() {
  const router = useRouter();
  return (
    <Shell>
      <TopBar title="College" onBack={() => router.history.back()} />
      <EmptyStateFromPreset preset="offline" onPrimary={() => router.invalidate()} />
    </Shell>
  );
}

function DetailNotFound() {
  const router = useRouter();
  return (
    <Shell>
      <TopBar title="College" onBack={() => router.history.back()} />
      <EmptyState
        scene="college"
        tone="slate"
        title="College not found"
        description="This college may have been removed or the link is invalid."
      />
    </Shell>
  );
}
