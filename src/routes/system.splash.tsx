// ============================================================================
// /system/splash — application initialization & central routing engine.
// Every authenticated entry passes through here. It performs real init work
// (session restore, config + profile load, device registration) with per-task
// timeout protection, then resolves the correct destination. No fixed delays.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/profile.functions";
import { getAppConfig, registerDeviceSession } from "@/lib/system.functions";
import {
  INIT_STEPS,
  resolveDestination,
  withTimeout,
  getDeviceToken,
  type SplashState,
} from "@/lib/system";
import { Button, Text, GlassPanel, ProgressBar } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, gradients } from "@/lib/ds";

export const Route = createFileRoute("/system/splash")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Starting Coligo" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SplashPage,
});

const TASK_TIMEOUT = 8000;

function SplashPage() {
  const navigate = useNavigate();
  const fetchConfig = useServerFn(getAppConfig);
  const fetchProfile = useServerFn(getMyProfile);
  const registerDevice = useServerFn(registerDeviceSession);

  const [stepIndex, setStepIndex] = useState(0);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const runningRef = useRef(false);

  const initialize = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setOffline(false);

    try {
      // 1. Connect + restore session (getUser refreshes tokens when possible).
      setStepIndex(0);
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), TASK_TIMEOUT, "session");

      setStepIndex(1);
      const authenticated = !!user;

      // 2. Load app configuration (public).
      setStepIndex(2);
      const config = await withTimeout(fetchConfig(), TASK_TIMEOUT, "config");

      // 3. Load profile only when authenticated.
      setStepIndex(3);
      let onboardingCompleted = false;
      let accountStatus: SplashState["accountStatus"] = null;
      if (authenticated) {
        try {
          const profile = await withTimeout(fetchProfile(), TASK_TIMEOUT, "profile");
          onboardingCompleted = profile?.onboardingCompleted ?? false;
          accountStatus = profile?.accountStatus ?? "active";
        } catch {
          accountStatus = "active";
        }
      }

      // 4. Register this device + preload (non-blocking, best-effort).
      setStepIndex(4);
      if (authenticated && accountStatus === "active") {
        void registerDevice({
          data: { deviceToken: getDeviceToken(), platform: "web" },
        }).catch(() => {});
      }

      // 5. Resolve destination and hand off.
      const dest = resolveDestination({
        authenticated,
        onboardingCompleted,
        accountStatus,
        config: { maintenanceEnabled: config.maintenanceEnabled },
      });

      if ("signOut" in dest && dest.signOut) {
        await supabase.auth.signOut();
      }
      navigate({ to: dest.to, replace: true });
    } catch {
      // Network / timeout failure → offer recovery, auto-retry with backoff.
      setOffline(true);
      runningRef.current = false;
    }
  }, [fetchConfig, fetchProfile, registerDevice, navigate]);

  useEffect(() => {
    void initialize();
  }, [initialize, attempt]);

  // Auto-retry every 6s while offline.
  useEffect(() => {
    if (!offline) return;
    const t = setTimeout(() => setAttempt((a) => a + 1), 6000);
    return () => clearTimeout(t);
  }, [offline]);

  const progress = ((stepIndex + 1) / INIT_STEPS.length) * 100;

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
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <BrandLogo
          className="cm-splash-logo"
          size={84}
          showWordmark={false}
          eager
        />


        <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[4] }}>
          Coligo
        </Text>

        {offline ? (
          <GlassPanel style={{ padding: spacing[5], marginTop: spacing[5] }}>
            <span
              aria-hidden
              className="inline-flex items-center justify-center"
              style={{ width: 48, height: 48, borderRadius: radii.md, background: "rgba(255,59,48,0.1)", color: colors.danger }}
            >
              <WifiOff style={{ width: 24, height: 24 }} />
            </span>
            <Text variant="title" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
              Can't connect
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
              Check your internet connection. We'll keep trying automatically.
            </Text>
            <div style={{ marginTop: spacing[4] }}>
              <Button
                variant="primary"
                fullWidth
                leftIcon={<RefreshCw style={{ width: 18, height: 18 }} />}
                onClick={() => setAttempt((a) => a + 1)}
              >
                Retry now
              </Button>
            </div>
          </GlassPanel>
        ) : (
          <div style={{ marginTop: spacing[6] }} role="status" aria-live="polite">
            <div style={{ maxWidth: 220, margin: "0 auto" }}>
              <ProgressBar value={progress} />
            </div>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing[3] }}>
              {INIT_STEPS[stepIndex]?.label ?? "Getting things ready"}…
            </Text>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cm-splash-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.92; }
        }
        .cm-splash-logo { animation: cm-splash-pulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cm-splash-logo { animation: none; }
        }
      `}</style>
    </main>
  );
}
