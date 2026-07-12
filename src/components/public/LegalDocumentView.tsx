import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import type { LegalDocument } from "@/lib/public-content.functions";
import { Text, GlassPanel, Skeleton } from "@/components/ds/glass";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { SectionReveal } from "./SectionReveal";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Renders a database-driven legal document (headings, paragraphs, lists). */
export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <article style={{ display: "grid", gap: spacing[4] }}>
      <SectionReveal>
        <Link
          to="/"
          className="inline-flex items-center"
          style={{
            gap: spacing[0],
            color: colors.primary,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to Home
        </Link>
        <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
          {doc.title}
        </Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[2], marginTop: spacing[2] }}>
          <Text variant="bodySm" tone="muted">
            Last updated {formatDate(doc.lastUpdated)}
          </Text>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.textSecondary,
              padding: `2px ${spacing[1]}px`,
              borderRadius: radii.pill,
              background: surfaces.glassSoft,
              border: `1px solid ${surfaces.border}`,
            }}
          >
            Version {doc.version}
          </span>
        </div>
      </SectionReveal>

      {doc.sections.map((section, i) => (
        <SectionReveal key={`${section.heading}-${i}`} delay={Math.min(i, 6) * 40}>
          <GlassPanel soft style={{ padding: spacing[5] }}>
            <Text variant="headingSm" color={colors.textPrimary}>
              {section.heading}
            </Text>
            {section.type === "paragraph" ? (
              <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
                {section.content}
              </Text>
            ) : (
              <ul
                style={{
                  margin: `${spacing[2]}px 0 0`,
                  paddingLeft: spacing[4],
                  display: "grid",
                  gap: spacing[1],
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
          </GlassPanel>
        </SectionReveal>
      ))}
    </article>
  );
}

/** Skeleton shown while the legal document loads. */
export function LegalDocumentSkeleton() {
  return (
    <div style={{ display: "grid", gap: spacing[4] }}>
      <Card variant="plain" style={{ height: 90 }} />
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} variant="plain" style={{ height: 140 }} />
      ))}
    </div>
  );
}
