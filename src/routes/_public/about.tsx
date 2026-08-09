import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Target,
  Eye,
  Rocket,
  ShieldCheck,
  Heart,
  BadgeCheck,
  Users,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

import { companyInfoQuery, landingStatsQuery } from "@/lib/public-content.functions";
import type { CompanyInfo } from "@/lib/public-content.functions";
import { PageContainer, Timeline } from "@/components/public/Timeline";
import { SectionReveal } from "@/components/public/SectionReveal";
import { Card, StatCard } from "@/components/ds/card";
import { Text, GlassPanel } from "@/components/ds/glass";
import { colors, spacing, radii } from "@/lib/ds";

export const Route = createFileRoute("/_public/about")({
  head: () => ({
    meta: [
      { title: "About Coligo — The Verified College Dating Mission" },
      {
        name: "description",
        content: "Learn about Coligo's mission to build the safest dating community for verified college students in India.",
      },
      { property: "og:title", content: "About Coligo" },
      {
        property: "og:description",
        content: "Our mission to build a safe, verified student dating community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(companyInfoQuery());
    context.queryClient.ensureQueryData(landingStatsQuery());
  },
  component: AboutPage,
});

const GOAL_ICONS: LucideIcon[] = [ShieldCheck, Eye];

function pick(info: CompanyInfo[], type: string) {
  return info.filter((i) => i.sectionType === type);
}

function AboutPage() {
  const { data: info } = useSuspenseQuery(companyInfoQuery());
  const { data: stats } = useSuspenseQuery(landingStatsQuery());

  const overview = pick(info, "overview")[0];
  const mission = pick(info, "mission")[0];
  const vision = pick(info, "vision")[0];
  const goals = pick(info, "goal");
  const safety = pick(info, "safety")[0];
  const studentFirst = pick(info, "student_first")[0];
  const verification = pick(info, "verification")[0];
  const milestones = pick(info, "milestone");

  const colleges = stats.find((s) => s.key === "participating_colleges");
  const students = stats.find((s) => s.key === "registered_students");

  return (
    <PageContainer>
      {/* Hero / overview */}
      <SectionReveal>
        <Text variant="overline" tone="muted" as="p">
          About us
        </Text>
        <Text variant="displayMd" color={colors.textPrimary} style={{ marginTop: spacing[1], maxWidth: 720 }}>
          {overview?.title ?? "Who We Are"}
        </Text>
        <Text variant="bodyLg" tone="secondary" style={{ marginTop: spacing[3], maxWidth: 680 }}>
          {overview?.body}
        </Text>
      </SectionReveal>

      {/* Live totals */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: spacing[6] }}
      >
        <SectionReveal>
          <StatCard
            label="Registered students"
            value={(students?.value ?? 0).toLocaleString("en-IN")}
            icon={<Users style={{ width: 18, height: 18 }} />}
          />
        </SectionReveal>
        <SectionReveal delay={60}>
          <StatCard
            label="Partner colleges"
            value={(colleges?.value ?? 0).toLocaleString("en-IN")}
            icon={<GraduationCap style={{ width: 18, height: 18 }} />}
          />
        </SectionReveal>
      </div>

      {/* Mission + Vision */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: spacing[6] }}
      >
        {mission ? (
          <SectionReveal>
            <Card style={{ height: "100%" }}>
              <span
                className="inline-flex items-center justify-center"
                style={{ width: 44, height: 44, borderRadius: radii.md, background: "rgba(10,132,255,0.10)", color: colors.primary }}
              >
                <Target style={{ width: 22, height: 22 }} />
              </span>
              <Text variant="headingSm" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
                {mission.title}
              </Text>
              <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
                {mission.body}
              </Text>
            </Card>
          </SectionReveal>
        ) : null}
        {vision ? (
          <SectionReveal delay={60}>
            <Card style={{ height: "100%" }}>
              <span
                className="inline-flex items-center justify-center"
                style={{ width: 44, height: 44, borderRadius: radii.md, background: "rgba(255,55,95,0.10)", color: colors.accent }}
              >
                <Rocket style={{ width: 22, height: 22 }} />
              </span>
              <Text variant="headingSm" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
                {vision.title}
              </Text>
              <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
                {vision.body}
              </Text>
            </Card>
          </SectionReveal>
        ) : null}
      </div>

      {/* Platform goals */}
      {goals.length > 0 ? (
        <div style={{ marginTop: spacing[8] }}>
          <SectionReveal>
            <Text variant="displaySm" color={colors.textPrimary}>
              What we stand for
            </Text>
          </SectionReveal>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: spacing[4] }}
          >
            {goals.map((goal, i) => {
              const Icon = GOAL_ICONS[i % GOAL_ICONS.length];
              return (
                <SectionReveal key={goal.key} delay={Math.min(i, 4) * 60}>
                  <Card style={{ height: "100%" }}>
                    <span
                      className="inline-flex items-center justify-center"
                      style={{ width: 44, height: 44, borderRadius: radii.md, background: "rgba(52,199,89,0.12)", color: colors.success }}
                    >
                      <Icon style={{ width: 22, height: 22 }} />
                    </span>
                    <Text variant="headingSm" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
                      {goal.title}
                    </Text>
                    <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
                      {goal.body}
                    </Text>
                  </Card>
                </SectionReveal>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Safety / student-first / verification */}
      <div style={{ marginTop: spacing[8], display: "grid", gap: spacing[4] }}>
        {[
          { data: safety, Icon: ShieldCheck, tint: "rgba(52,199,89,0.12)", color: colors.success },
          { data: studentFirst, Icon: Heart, tint: "rgba(255,55,95,0.10)", color: colors.accent },
          { data: verification, Icon: BadgeCheck, tint: "rgba(10,132,255,0.10)", color: colors.primary },
        ]
          .filter((s) => s.data)
          .map(({ data, Icon, tint, color }, i) => (
            <SectionReveal key={data!.key} delay={Math.min(i, 3) * 60}>
              <GlassPanel soft style={{ padding: spacing[5] }}>
                <div style={{ display: "flex", gap: spacing[3] }}>
                  <span
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{ width: 44, height: 44, borderRadius: radii.md, background: tint, color }}
                  >
                    <Icon style={{ width: 22, height: 22 }} />
                  </span>
                  <div>
                    <Text variant="headingSm" color={colors.textPrimary}>
                      {data!.title}
                    </Text>
                    <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
                      {data!.body}
                    </Text>
                  </div>
                </div>
              </GlassPanel>
            </SectionReveal>
          ))}
      </div>

      {/* Roadmap / milestones */}
      {milestones.length > 0 ? (
        <div style={{ marginTop: spacing[8] }}>
          <SectionReveal>
            <Text variant="displaySm" color={colors.textPrimary}>
              Our journey
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
              Where we've been and where we're headed.
            </Text>
          </SectionReveal>
          <div style={{ marginTop: spacing[5], maxWidth: 640 }}>
            <Timeline
              items={milestones.map((m) => ({
                id: m.key,
                title: m.title,
                body: m.body,
                marker: [m.meta.quarter, m.meta.year].filter(Boolean).join(" · "),
              }))}
            />
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
