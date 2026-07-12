import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShieldCheck,
  Flame,
  Heart,
  MessageCircle,
  Lock,
  ChevronDown,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

import {
  landingStatsQuery,
  featuredCollegesQuery,
  faqsQuery,
  homepageMediaQuery,
} from "@/lib/public-content.functions";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { Card, StatCard } from "@/components/ds/card";
import { SectionReveal } from "@/components/public/SectionReveal";
import { colors, spacing, radii, surfaces, gradients, shadows } from "@/lib/ds";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "Coligo — Dating for Verified College Students in India" },
      {
        name: "description",
        content:
          "Coligo is the exclusive dating app for verified college students in India. Discover students, match, and chat securely in a privacy-first community.",
      },
      { property: "og:title", content: "Coligo — Dating for Verified College Students" },
      {
        property: "og:description",
        content:
          "Join thousands of verified college students. Swipe, match, and message securely on a privacy-first platform built for campus life.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(landingStatsQuery());
    context.queryClient.ensureQueryData(featuredCollegesQuery());
    context.queryClient.ensureQueryData(faqsQuery());
    context.queryClient.prefetchQuery(homepageMediaQuery());
  },
  component: LandingPage,
});

const FEATURES = [
  {
    Icon: ShieldCheck,
    title: "Verified college students",
    body: "Every profile is verified with a college email or student ID. No bots, no fakes — just real students.",
  },
  {
    Icon: Flame,
    title: "Swipe-based discovery",
    body: "Discover students from your campus and nearby colleges with a fast, familiar swipe experience.",
  },
  {
    Icon: Heart,
    title: "Mutual matches",
    body: "Connect only when the interest is mutual. No pressure, no cold messages — just genuine matches.",
  },
  {
    Icon: MessageCircle,
    title: "Secure messaging",
    body: "Chat privately with your matches inside a safe, moderated environment built for students.",
  },
  {
    Icon: Lock,
    title: "Privacy-first experience",
    body: "Your data stays yours. Full control over your visibility and never sold to advertisers.",
  },
] as const;

function formatStat(value: number, suffix: string) {
  const compact =
    value >= 1000
      ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
          value,
        )
      : value.toLocaleString("en-US");
  return `${compact}${suffix}`;
}

function Hero() {
  return (
    <section
      className="mx-auto"
      style={{ maxWidth: 1120, padding: `${spacing[8]}px ${spacing[4]}px ${spacing[6]}px`, textAlign: "center" }}
    >
      <SectionReveal>
        <span
          className="inline-flex items-center"
          style={{
            gap: spacing[0],
            padding: `6px ${spacing[2]}px`,
            borderRadius: radii.pill,
            background: "rgba(10,132,255,0.10)",
            color: colors.primaryDeep,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <GraduationCap style={{ width: 16, height: 16 }} />
          Exclusively for verified college students
        </span>
      </SectionReveal>
      <SectionReveal delay={60}>
        <Text
          variant="displayXl"
          color={colors.textPrimary}
          style={{ marginTop: spacing[4], maxWidth: 760, marginInline: "auto" }}
        >
          Meet real students. Make real connections.
        </Text>
      </SectionReveal>
      <SectionReveal delay={120}>
        <Text
          variant="bodyLg"
          tone="secondary"
          style={{ marginTop: spacing[3], maxWidth: 560, marginInline: "auto" }}
        >
          Coligo is the privacy-first dating community made just for verified college students in
          India. Swipe, match, and message — safely.
        </Text>
      </SectionReveal>
      <SectionReveal delay={180}>
        <div
          className="flex flex-wrap items-center justify-center"
          style={{ gap: spacing[2], marginTop: spacing[5] }}
        >
          <Link to="/auth/signup" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="lg" pill rightIcon={<ArrowRight style={{ width: 18, height: 18 }} />}>
              Get Started
            </Button>
          </Link>
          <Link to="/auth/login" style={{ textDecoration: "none" }}>
            <Button variant="secondary" size="lg" pill>
              Log in
            </Button>
          </Link>
        </div>
      </SectionReveal>
    </section>
  );
}

function StatsSection() {
  const { data: stats } = useSuspenseQuery(landingStatsQuery());
  if (stats.length === 0) return null;
  return (
    <section className="mx-auto" style={{ maxWidth: 1120, padding: `${spacing[5]}px ${spacing[4]}px` }}>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
      >
        {stats.map((stat, i) => (
          <SectionReveal key={stat.key} delay={Math.min(i, 4) * 60}>
            <StatCard label={stat.label} value={formatStat(stat.value, stat.suffix)} />
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="mx-auto" style={{ maxWidth: 1120, padding: `${spacing[6]}px ${spacing[4]}px` }}>
      <SectionReveal>
        <Text variant="overline" tone="muted" align="center" as="p">
          Why Coligo
        </Text>
        <Text variant="displaySm" color={colors.textPrimary} align="center" style={{ marginTop: spacing[1] }}>
          Everything you need to connect
        </Text>
      </SectionReveal>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: spacing[5] }}
      >
        {FEATURES.map(({ Icon, title, body }, i) => (
          <SectionReveal key={title} delay={Math.min(i, 5) * 60}>
            <Card style={{ height: "100%" }}>
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.md,
                  background: "rgba(10,132,255,0.10)",
                  color: colors.primary,
                }}
              >
                <Icon style={{ width: 22, height: 22 }} />
              </span>
              <Text variant="headingSm" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
                {title}
              </Text>
              <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
                {body}
              </Text>
            </Card>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}

function CollegesSection() {
  const { data: colleges } = useSuspenseQuery(featuredCollegesQuery());
  if (colleges.length === 0) return null;
  return (
    <section className="mx-auto" style={{ maxWidth: 1120, padding: `${spacing[6]}px ${spacing[4]}px` }}>
      <SectionReveal>
        <Text variant="overline" tone="muted" as="p">
          Top campuses
        </Text>
        <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[1] }}>
          College rankings
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
          The most active colleges by number of verified students.
        </Text>
      </SectionReveal>
      <SectionReveal delay={80}>
        <GlassPanel soft style={{ marginTop: spacing[4], padding: 0, overflow: "hidden" }}>
          {colleges.map((college, i) => (
            <div
              key={college.id}
              className="flex items-center"
              style={{
                gap: spacing[3],
                padding: `${spacing[3]}px ${spacing[4]}px`,
                borderTop: i === 0 ? "none" : `1px solid ${surfaces.borderSoft}`,
              }}
            >
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.pill,
                  fontSize: 14,
                  fontWeight: 700,
                  color: i < 3 ? "#fff" : colors.textSecondary,
                  background: i < 3 ? gradients.primaryButton : surfaces.glassSoft,
                  border: i < 3 ? "none" : `1px solid ${surfaces.border}`,
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Text variant="title" color={colors.textPrimary} truncate>
                  {college.name}
                </Text>
                {college.city ? (
                  <Text variant="bodySm" tone="muted" truncate>
                    {college.city}
                  </Text>
                ) : null}
              </div>
              <Text variant="title" numeric color={colors.textPrimary}>
                {college.verifiedStudents.toLocaleString("en-IN")}
              </Text>
            </div>
          ))}
        </GlassPanel>
      </SectionReveal>
    </section>
  );
}

function ScreenshotsSection() {
  const { data: media } = useSuspenseQuery(homepageMediaQuery());
  if (media.length === 0) return null;
  return (
    <section className="mx-auto" style={{ maxWidth: 1120, padding: `${spacing[6]}px ${spacing[4]}px` }}>
      <SectionReveal>
        <Text variant="displaySm" color={colors.textPrimary} align="center">
          See it in action
        </Text>
      </SectionReveal>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: spacing[5] }}
      >
        {media.map((item, i) => (
          <SectionReveal key={item.id} delay={Math.min(i, 5) * 60}>
            <Card padding={0} style={{ overflow: "hidden" }}>
              <img
                src={item.url}
                alt={item.title || "App screenshot"}
                loading="lazy"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
              {item.caption ? (
                <div style={{ padding: spacing[3] }}>
                  <Text variant="bodySm" tone="secondary">
                    {item.caption}
                  </Text>
                </div>
              ) : null}
            </Card>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <GlassPanel soft style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center text-left"
        style={{ gap: spacing[2], padding: `${spacing[3]}px ${spacing[4]}px`, background: "transparent" }}
      >
        <Text variant="title" color={colors.textPrimary} style={{ flex: 1 }}>
          {question}
        </Text>
        <ChevronDown
          style={{
            width: 20,
            height: 20,
            color: colors.textMuted,
            transition: "transform 220ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 320ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <Text
          variant="body"
          tone="secondary"
          style={{ padding: `0 ${spacing[4]}px ${spacing[4]}px` }}
        >
          {answer}
        </Text>
      </div>
    </GlassPanel>
  );
}

function FaqSection() {
  const { data: faqs } = useSuspenseQuery(faqsQuery());
  if (faqs.length === 0) return null;
  return (
    <section className="mx-auto" style={{ maxWidth: 760, padding: `${spacing[6]}px ${spacing[4]}px` }}>
      <SectionReveal>
        <Text variant="displaySm" color={colors.textPrimary} align="center">
          Frequently asked questions
        </Text>
      </SectionReveal>
      <div style={{ display: "grid", gap: spacing[2], marginTop: spacing[5] }}>
        {faqs.map((faq, i) => (
          <SectionReveal key={faq.id} delay={Math.min(i, 6) * 40}>
            <FaqItem question={faq.question} answer={faq.answer} />
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="mx-auto" style={{ maxWidth: 1120, padding: `${spacing[6]}px ${spacing[4]}px` }}>
      <SectionReveal>
        <GlassPanel
          style={{
            padding: spacing[8],
            textAlign: "center",
            background: gradients.primaryButton,
            boxShadow: shadows.primaryGlow,
            border: "none",
          }}
        >
          <Text variant="displaySm" color="#fff">
            Ready to meet your match?
          </Text>
          <Text variant="bodyLg" color="rgba(255,255,255,0.9)" style={{ marginTop: spacing[2] }}>
            Join thousands of verified students already connecting on Coligo.
          </Text>
          <div style={{ marginTop: spacing[5], display: "inline-flex" }}>
            <Link to="/auth/signup" style={{ textDecoration: "none" }}>
              <Button variant="glass" size="lg" pill rightIcon={<ArrowRight style={{ width: 18, height: 18 }} />}>
                Create your profile
              </Button>
            </Link>
          </div>
        </GlassPanel>
      </SectionReveal>
    </section>
  );
}

function LandingPage() {
  return (
    <>
      <h1 className="sr-only">Coligo — Dating for verified college students in India</h1>
      <Hero />
      <StatsSection />
      <FeaturesSection />
      <CollegesSection />
      <ScreenshotsSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
