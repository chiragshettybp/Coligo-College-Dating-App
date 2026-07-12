// ============================================================================
// Reusable 404 view. Rendered by both the root notFoundComponent (unmatched
// URLs) and the explicit /404 route. Logs the unknown route for analytics and
// resolves the Home button by authentication state.
// ============================================================================
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Compass, ArrowLeft, Home, LifeBuoy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { logUnknownRoute } from "@/lib/system.functions";
import { getDiagnosticSessionId } from "@/lib/system";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, gradients } from "@/lib/ds";

export function NotFoundView() {
  const [homeTo, setHomeTo] = useState<"/" | "/app">("/");
  const logged = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setHomeTo("/app");
    });

    if (!logged.current) {
      logged.current = true;
      void logUnknownRoute({
        data: {
          path: window.location.pathname + window.location.search,
          referrer: document.referrer || "",
        },
      }).catch(() => {});
      // touch to keep a stable diagnostic id around for support flows.
      getDiagnosticSessionId();
    }
  }, []);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign(homeTo);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        backgroundAttachment: "fixed",
        fontFamily: FONT_FAMILY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing[4],
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <GlassPanel style={{ padding: spacing[6], textAlign: "center" }}>
          <span
            aria-hidden
            className="inline-flex items-center justify-center"
            style={{ width: 60, height: 60, borderRadius: radii.lg, background: gradients.primaryButton, color: "#fff" }}
          >
            <Compass style={{ width: 30, height: 30 }} />
          </span>

          <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[4] }}>
            Page not found
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
            The page you're looking for doesn't exist or may have moved. Let's
            get you back on track.
          </Text>

          <div style={{ marginTop: spacing[5], display: "grid", gap: spacing[2] }}>
            <Link to={homeTo} style={{ textDecoration: "none" }}>
              <Button variant="primary" fullWidth leftIcon={<Home style={{ width: 18, height: 18 }} />}>
                Go home
              </Button>
            </Link>
            <Button
              variant="secondary"
              fullWidth
              leftIcon={<ArrowLeft style={{ width: 18, height: 18 }} />}
              onClick={goBack}
            >
              Go back
            </Button>
            <Link to="/contact" style={{ textDecoration: "none" }}>
              <Button variant="ghost" fullWidth leftIcon={<LifeBuoy style={{ width: 18, height: 18 }} />}>
                Contact support
              </Button>
            </Link>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
