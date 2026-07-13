// ============================================================================
// RouteFallback — branded full-screen pending state for guard/layout routes.
// Shown while a parent loader (e.g. the onboarding guard) resolves, before the
// child route's own skeleton can render. Its container spacing mirrors the real
// module layout (max-width 560, gap = spacing[5], matching padding) so the
// hand-off to loaded content produces no layout shift and keeps a consistent
// visual hierarchy. Fades in gently to avoid a jarring blank frame.
// ============================================================================
import { Skeleton } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, spacing, radii } from "@/lib/ds";

export function RouteFallback() {
  return (
    <div
      className="animate-fade-in"
      role="status"
      aria-busy="true"
      aria-label="Loading"
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
          padding: `${spacing[4]}px ${spacing[4]}px ${spacing[9] + 64}px`,
          display: "flex",
          flexDirection: "column",
          gap: spacing[5],
        }}
      >
        {/* Header: avatar + identity, mirrors the loaded module header */}
        <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
          <div className="flex items-center" style={{ gap: spacing[2], minWidth: 0 }}>
            <Skeleton style={{ width: 48, height: 48, borderRadius: 999, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: spacing[1], minWidth: 0 }}>
              <Skeleton style={{ width: 96, height: 11, borderRadius: radii.sm }} />
              <Skeleton style={{ width: 148, height: 18, borderRadius: radii.sm }} />
            </div>
          </div>
          <Skeleton style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0 }} />
        </div>

        {/* Hero card */}
        <Skeleton style={{ height: 132, borderRadius: radii.lg }} />

        {/* Two-up stat grid */}
        <div
          className="grid"
          style={{ gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}
        >
          <Skeleton style={{ height: 104, borderRadius: radii.lg }} />
          <Skeleton style={{ height: 104, borderRadius: radii.lg }} />
        </div>

        {/* Content panel */}
        <Skeleton style={{ height: 208, borderRadius: radii.lg }} />
      </div>
    </div>
  );
}
