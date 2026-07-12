import type { ReactNode } from "react";

import { Text } from "@/components/ds/glass";
import { colors, spacing, radii, gradients, surfaces } from "@/lib/ds";
import { SectionReveal } from "./SectionReveal";

export type TimelineItem = {
  id: string;
  title: string;
  body: string;
  marker?: string;
};

/** Vertical milestone timeline built from design-system tokens. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, position: "relative" }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 15,
          top: 8,
          bottom: 8,
          width: 2,
          background: surfaces.border,
          borderRadius: radii.pill,
        }}
      />
      {items.map((item, i) => (
        <SectionReveal as="li" key={item.id} delay={Math.min(i, 6) * 60}>
          <div style={{ display: "flex", gap: spacing[3], paddingBottom: spacing[5] }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <span
                aria-hidden
                className="flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.pill,
                  background: gradients.primaryButton,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  boxShadow: "0 0 0 4px rgba(248,248,247,1)",
                }}
              >
                {i + 1}
              </span>
            </div>
            <div style={{ minWidth: 0, paddingTop: 2 }}>
              {item.marker ? (
                <Text variant="overline" tone="muted">
                  {item.marker}
                </Text>
              ) : null}
              <Text variant="headingSm" color={colors.textPrimary} style={{ marginTop: 2 }}>
                {item.title}
              </Text>
              <Text variant="body" tone="secondary" style={{ marginTop: spacing[0] }}>
                {item.body}
              </Text>
            </div>
          </div>
        </SectionReveal>
      ))}
    </ol>
  );
}

/** Shared page container with a title/subtitle header for content pages. */
export function PageContainer({
  children,
  narrow = false,
  style,
}: {
  children: ReactNode;
  narrow?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: narrow ? 760 : 1120,
        padding: `${spacing[7]}px ${spacing[4]}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
