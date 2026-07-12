import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  MessageSquareHeart,
  ShieldAlert,
  UserX,
  Ban,
  AlertTriangle,
  EyeOff,
  LifeBuoy,
  Flag,
  Gavel,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

import { legalDocumentQuery } from "@/lib/public-content.functions";
import { LegalDocumentSkeleton } from "@/components/public/LegalDocumentView";
import { PageContainer } from "@/components/public/Timeline";
import { SectionReveal } from "@/components/public/SectionReveal";
import { Card } from "@/components/ds/card";
import { Text } from "@/components/ds/glass";
import { colors, spacing, radii } from "@/lib/ds";

export const Route = createFileRoute("/_public/community-guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — CampusMatch" },
      {
        name: "description",
        content:
          "How to keep CampusMatch safe and respectful: our community guidelines on communication, harassment, safety, and reporting.",
      },
      { property: "og:title", content: "Community Guidelines — CampusMatch" },
      {
        property: "og:description",
        content: "How to keep CampusMatch safe and respectful for everyone.",
      },
      { property: "og:type", content: "article" },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(legalDocumentQuery("community-guidelines")),
  pendingComponent: () => (
    <PageContainer>
      <LegalDocumentSkeleton />
    </PageContainer>
  ),
  component: GuidelinesPage,
  notFoundComponent: () => (
    <PageContainer>
      <Text variant="headingLg">Document not found</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
        This document is not available right now.
      </Text>
    </PageContainer>
  ),
});

function iconFor(heading: string): { Icon: LucideIcon; tint: string; color: string } {
  const h = heading.toLowerCase();
  if (h.includes("respect") || h.includes("communication"))
    return { Icon: MessageSquareHeart, tint: "rgba(10,132,255,0.10)", color: colors.primary };
  if (h.includes("harass"))
    return { Icon: ShieldAlert, tint: "rgba(255,59,48,0.10)", color: colors.danger };
  if (h.includes("fake"))
    return { Icon: UserX, tint: "rgba(255,159,10,0.12)", color: colors.warning };
  if (h.includes("spam")) return { Icon: Ban, tint: "rgba(255,159,10,0.12)", color: colors.warning };
  if (h.includes("scam"))
    return { Icon: AlertTriangle, tint: "rgba(255,59,48,0.10)", color: colors.danger };
  if (h.includes("inappropriate") || h.includes("content"))
    return { Icon: EyeOff, tint: "rgba(255,59,48,0.10)", color: colors.danger };
  if (h.includes("safety") || h.includes("recommend"))
    return { Icon: LifeBuoy, tint: "rgba(52,199,89,0.12)", color: colors.success };
  if (h.includes("report"))
    return { Icon: Flag, tint: "rgba(10,132,255,0.10)", color: colors.primary };
  if (h.includes("suspension") || h.includes("account"))
    return { Icon: Gavel, tint: "rgba(120,120,128,0.12)", color: colors.textSecondary };
  return { Icon: ShieldAlert, tint: "rgba(10,132,255,0.10)", color: colors.primary };
}

function GuidelinesPage() {
  const { data: doc } = useSuspenseQuery(legalDocumentQuery("community-guidelines"));
  if (!doc) throw notFound();

  return (
    <PageContainer>
      <SectionReveal>
        <Link
          to="/"
          className="inline-flex items-center"
          style={{ gap: spacing[0], color: colors.primary, textDecoration: "none", fontSize: 15, fontWeight: 600 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to Home
        </Link>
        <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
          {doc.title}
        </Text>
        <Text variant="bodyLg" tone="secondary" style={{ marginTop: spacing[2], maxWidth: 620 }}>
          These guidelines keep CampusMatch safe, respectful, and authentic for every verified student.
        </Text>
      </SectionReveal>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: spacing[6] }}
      >
        {doc.sections.map((section, i) => {
          const { Icon, tint, color } = iconFor(section.heading);
          return (
            <SectionReveal key={`${section.heading}-${i}`} delay={Math.min(i, 6) * 50}>
              <Card style={{ height: "100%" }}>
                <span
                  className="inline-flex items-center justify-center"
                  style={{ width: 44, height: 44, borderRadius: radii.md, background: tint, color }}
                >
                  <Icon style={{ width: 22, height: 22 }} />
                </span>
                <Text variant="headingSm" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
                  {section.heading}
                </Text>
                {section.type === "paragraph" ? (
                  <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
                    {section.content}
                  </Text>
                ) : (
                  <ul
                    style={{
                      margin: `${spacing[2]}px 0 0`,
                      paddingLeft: spacing[4],
                      display: "grid",
                      gap: spacing[0],
                    }}
                  >
                    {section.items.map((item, j) => (
                      <li key={j}>
                        <Text as="span" variant="body" tone="secondary">
                          {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </SectionReveal>
          );
        })}
      </div>
    </PageContainer>
  );
}
