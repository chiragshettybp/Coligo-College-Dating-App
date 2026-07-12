// ============================================================================
// Auth layout shell — shared chrome for every /auth/* screen.
// Provides the app background, brand lockup, a card container via <Outlet/>,
// and persistent legal links. Mobile-first, centered, one-handed friendly.
// ============================================================================
import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { Heart, ArrowLeft } from "lucide-react";

import { Text, Button } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, gradients } from "@/lib/ds";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
  errorComponent: AuthError,
});

function AuthLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        backgroundAttachment: "fixed",
        fontFamily: FONT_FAMILY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: spacing[4],
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between" style={{ paddingTop: spacing[2], paddingBottom: spacing[6] }}>
          <Link
            to="/"
            className="inline-flex items-center"
            style={{ gap: 6, color: colors.textSecondary, textDecoration: "none", fontSize: 15, fontWeight: 600 }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Home
          </Link>
          <BrandLogo size={32} wordmarkVariant="headingSm" eager />

        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Outlet />
        </div>

        <footer
          className="flex items-center justify-center"
          style={{ gap: spacing[2], flexWrap: "wrap", padding: `${spacing[6]}px 0 ${spacing[2]}px`, color: colors.textMuted, fontSize: 13 }}
        >
          <Link to="/privacy" style={{ color: colors.textMuted, textDecoration: "none" }}>
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link to="/terms" style={{ color: colors.textMuted, textDecoration: "none" }}>
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link to="/community-guidelines" style={{ color: colors.textMuted, textDecoration: "none" }}>
            Guidelines
          </Link>
        </footer>
      </div>
    </div>
  );
}

function AuthError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="mx-auto text-center" style={{ maxWidth: 440, padding: spacing[4] }}>
      <Text variant="headingLg" color={colors.textPrimary}>
        Something went wrong
      </Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
        {error.message || "Please try again."}
      </Text>
      <div style={{ marginTop: spacing[4] }}>
        <Button variant="primary" onClick={() => router.invalidate()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
