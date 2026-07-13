// ============================================================================
// RouteFallback — branded full-screen pending state for guard/layout routes.
// Shown while a parent loader (e.g. the onboarding guard) resolves, before the
// child route's own skeleton can render. Matches the app background and fades
// in gently to avoid a jarring blank frame on cold/slow loads.
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
          padding: spacing[4],
          display: "flex",
          flexDirection: "column",
          gap: spacing[4],
        }}
      >
        <div className="flex items-center" style={{ gap: spacing[2] }}>
          <Skeleton style={{ width: 52, height: 52, borderRadius: 999 }} />
          <div style={{ flex: 1 }}>
            <Skeleton style={{ width: 120, height: 12 }} />
            <Skeleton style={{ width: 160, height: 20, marginTop: 8 }} />
          </div>
        </div>
        <Skeleton style={{ height: 140, borderRadius: radii.lg }} />
        <Skeleton style={{ height: 200, borderRadius: radii.lg }} />
      </div>
    </div>
  );
}
