// ============================================================================
// /system/maintenance — shown while the app is temporarily unavailable.
// Maintenance is controlled entirely from Supabase (application_settings) and
// pushed in realtime, so the page auto-recovers the moment maintenance ends.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Wrench, RefreshCw, Mail } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { appConfigQuery } from "@/lib/system.functions";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, gradients } from "@/lib/ds";

export const Route = createFileRoute("/system/maintenance")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Under maintenance — Coligo" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MaintenancePage,
});

function formatEta(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function MaintenancePage() {
  const navigate = useNavigate();
  const { data: config, refetch, isFetching } = useQuery(appConfigQuery());
  const [retrying, setRetrying] = useState(false);

  // When maintenance ends (via refetch or realtime), continue startup.
  useEffect(() => {
    if (config && !config.maintenanceEnabled) {
      navigate({ to: "/system/splash", replace: true });
    }
  }, [config, navigate]);

  // Realtime: react the instant an admin toggles maintenance off.
  useEffect(() => {
    const channel = supabase
      .channel("application_settings_maintenance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "application_settings" },
        () => {
          void refetch();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Auto-retry every 2 minutes.
  useEffect(() => {
    const t = setInterval(() => void refetch(), 120_000);
    return () => clearInterval(t);
  }, [refetch]);

  const onRetry = async () => {
    setRetrying(true);
    await refetch();
    setRetrying(false);
  };

  const eta = formatEta(config?.estimatedCompletion ?? null);
  const supportEmail = config?.supportEmail ?? "support@coligo.app";

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
            <Wrench style={{ width: 30, height: 30 }} />
          </span>

          <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[4] }}>
            {config?.maintenanceTitle ?? "We'll be right back"}
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
            {config?.maintenanceMessage ??
              "Coligo is undergoing scheduled maintenance. Please check back soon."}
          </Text>

          {eta ? (
            <div
              style={{
                marginTop: spacing[4],
                padding: spacing[3],
                borderRadius: radii.md,
                background: "rgba(10,132,255,0.06)",
              }}
            >
              <Text variant="caption" tone="muted">
                Estimated return
              </Text>
              <Text variant="title" color={colors.textPrimary} style={{ marginTop: 2 }}>
                {eta}
              </Text>
            </div>
          ) : null}

          <div style={{ marginTop: spacing[5], display: "grid", gap: spacing[2] }}>
            <Button
              variant="primary"
              fullWidth
              loading={retrying || isFetching}
              leftIcon={<RefreshCw style={{ width: 18, height: 18 }} />}
              onClick={onRetry}
            >
              Retry
            </Button>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center justify-center"
              style={{
                gap: 8,
                height: 48,
                borderRadius: radii.md,
                border: `1px solid ${colors.textMuted}`,
                color: colors.textSecondary,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              <Mail style={{ width: 18, height: 18 }} />
              Contact support
            </a>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
