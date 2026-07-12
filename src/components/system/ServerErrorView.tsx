// ============================================================================
// Reusable 500 view. Rendered by the root errorComponent, the router
// defaultErrorComponent, and the explicit /500 route. Persists an error report
// to Supabase (server-side stack only), never exposes stack traces, and lets
// the user retry, go home, or file a support ticket.
// ============================================================================
import { useRouter, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, Home, Send, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { reportError, createSupportTicket } from "@/lib/system.functions";
import { collectDeviceInfo, getDiagnosticSessionId } from "@/lib/system";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, gradients } from "@/lib/ds";

export function ServerErrorView({
  error,
  reset,
}: {
  error?: Error;
  reset?: () => void;
}) {
  const router = useRouter();
  const [homeTo, setHomeTo] = useState<"/" | "/app">("/");
  const [errorId, setErrorId] = useState<string | null>(null);
  const [ticketSent, setTicketSent] = useState(false);
  const [reporting, setReporting] = useState(false);
  const reported = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setHomeTo("/app");
    });

    if (reported.current) return;
    reported.current = true;

    if (error) reportLovableError(error, { boundary: "system_500_view" });

    supabase.auth.getUser().then(({ data }) => {
      void reportError({
        data: {
          route: window.location.pathname + window.location.search,
          message: error?.message ?? "Unknown application error",
          stack: error?.stack ?? "",
          sessionId: getDiagnosticSessionId(),
          userId: data.user?.id ?? null,
          deviceInfo: collectDeviceInfo(),
        },
      })
        .then((res) => setErrorId(res.errorId))
        .catch(() => {});
    });
  }, [error]);

  const onRetry = () => {
    router.invalidate();
    reset?.();
  };

  const onReport = async () => {
    if (!errorId || ticketSent || reporting) return;
    setReporting(true);
    try {
      await createSupportTicket({ data: { errorId } });
      setTicketSent(true);
    } catch {
      /* non-blocking */
    } finally {
      setReporting(false);
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
            style={{ width: 60, height: 60, borderRadius: radii.lg, background: gradients.pink, color: "#fff" }}
          >
            <AlertTriangle style={{ width: 30, height: 30 }} />
          </span>

          <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[4] }}>
            Something went wrong
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
            We hit an unexpected problem. You can try again or head back home —
            your data is safe.
          </Text>

          {errorId ? (
            <Text variant="caption" tone="muted" style={{ display: "block", marginTop: spacing[3] }}>
              Reference: {errorId}
            </Text>
          ) : null}

          <div style={{ marginTop: spacing[5], display: "grid", gap: spacing[2] }}>
            <Button variant="primary" fullWidth leftIcon={<RefreshCw style={{ width: 18, height: 18 }} />} onClick={onRetry}>
              Try again
            </Button>
            <Link to={homeTo} style={{ textDecoration: "none" }}>
              <Button variant="secondary" fullWidth leftIcon={<Home style={{ width: 18, height: 18 }} />}>
                Go home
              </Button>
            </Link>
            <Button
              variant="ghost"
              fullWidth
              disabled={!errorId || ticketSent}
              loading={reporting}
              leftIcon={
                ticketSent ? (
                  <CheckCircle2 style={{ width: 18, height: 18 }} />
                ) : (
                  <Send style={{ width: 18, height: 18 }} />
                )
              }
              onClick={onReport}
            >
              {ticketSent ? "Issue reported" : "Report issue"}
            </Button>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
