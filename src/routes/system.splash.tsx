// ============================================================================
// /system/splash — application initialization & central routing engine.
// Every authenticated entry passes through here. It performs real init work
// (session restore, config + profile load, device registration) with per-task
// timeout protection, then resolves the correct destination. No fixed delays.
//
// Visually, the splash plays a cinematic 9:16 intro video (with audio) while
// the init pipeline runs in the background. When the video finishes AND the
// destination is resolved, the splash cross-fades smoothly into the app. If the
// video cannot load it retries, then falls back to a minimal branded loader so
// the user is never stuck.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/profile.functions";
import { getAppConfig, registerDeviceSession } from "@/lib/system.functions";
import {
  resolveDestination,
  withTimeout,
  getDeviceToken,
  type SplashState,
  type Destination,
} from "@/lib/system";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii } from "@/lib/ds";
import introVideo from "@/assets/coligo-intro.mp4.asset.json";
import introPoster from "@/assets/coligo-intro-poster.jpg.asset.json";

export const Route = createFileRoute("/system/splash")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Starting Coligo" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      // Preload the intro video + poster for instant, flash-free startup.
      { rel: "preload", as: "video", href: introVideo.url, type: "video/mp4" },
      { rel: "preload", as: "image", href: introPoster.url, fetchPriority: "high" },
    ],
  }),
  component: SplashPage,
});

const TASK_TIMEOUT = 8000;
const FADE_MS = 700; // cinematic cross-fade duration
const MAX_VIDEO_RETRIES = 2;

function SplashPage() {
  const navigate = useNavigate();
  const fetchConfig = useServerFn(getAppConfig);
  const fetchProfile = useServerFn(getMyProfile);
  const registerDevice = useServerFn(registerDeviceSession);

  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [fading, setFading] = useState(false);

  const runningRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const destinationRef = useRef<Destination | null>(null);
  const videoDoneRef = useRef(false);
  const handedOffRef = useRef(false);
  const videoRetriesRef = useRef(0);

  // ---- Cinematic hand-off: fade the splash out, then navigate. -------------
  const handOff = useCallback(() => {
    if (handedOffRef.current) return;
    const dest = destinationRef.current;
    if (!dest) return;
    handedOffRef.current = true;
    setFading(true);

    const go = async () => {
      const v = videoRef.current;
      if (v) {
        try {
          v.pause();
        } catch {
          /* ignore */
        }
        // Release the media element so it doesn't hold resources after nav.
        v.removeAttribute("src");
        v.load();
      }
      if ("signOut" in dest && dest.signOut) {
        await supabase.auth.signOut();
      }
      navigate({ to: dest.to, replace: true });
    };

    window.setTimeout(() => {
      void go();
    }, FADE_MS);
  }, [navigate]);

  // ---- Resolve destination + hand off when both video and init are ready. --
  const maybeHandOff = useCallback(() => {
    if (destinationRef.current && (videoDoneRef.current || videoFailed)) {
      handOff();
    }
  }, [handOff, videoFailed]);

  // ---- Real initialization pipeline (unchanged behavior). ------------------
  const initialize = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setOffline(false);

    try {
      // 1. Connect + restore session (getUser refreshes tokens when possible).
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), TASK_TIMEOUT, "session");

      const authenticated = !!user;

      // 2. Load app configuration (public).
      const config = await withTimeout(fetchConfig(), TASK_TIMEOUT, "config");

      // 3. Load profile only when authenticated.
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
      if (authenticated && accountStatus === "active") {
        void registerDevice({
          data: { deviceToken: getDeviceToken(), platform: "web" },
        }).catch(() => {});
      }

      // 5. Resolve destination and wait for the intro to finish before hand-off.
      const dest = resolveDestination({
        authenticated,
        onboardingCompleted,
        accountStatus,
        config: { maintenanceEnabled: config.maintenanceEnabled },
      });

      destinationRef.current = dest;
      maybeHandOff();
    } catch {
      // Network / timeout failure → offer recovery, auto-retry with backoff.
      setOffline(true);
      runningRef.current = false;
    }
  }, [fetchConfig, fetchProfile, registerDevice, maybeHandOff]);

  useEffect(() => {
    void initialize();
  }, [initialize, attempt]);

  // Auto-retry every 6s while offline.
  useEffect(() => {
    if (!offline) return;
    const t = window.setTimeout(() => {
      handedOffRef.current = false;
      setAttempt((a) => a + 1);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [offline]);

  // ---- Video autoplay (attempt with audio, fall back to muted). -----------
  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoFailed) return;

    let cancelled = false;
    const tryPlay = async () => {
      try {
        v.muted = false;
        await v.play();
      } catch {
        // Browser blocked autoplay-with-sound → play muted so the intro still
        // runs (never mute otherwise; this is only the last-resort fallback).
        if (cancelled) return;
        try {
          v.muted = true;
          await v.play();
        } catch {
          /* handled by onError / ended fallback */
        }
      }
    };
    void tryPlay();
    return () => {
      cancelled = true;
    };
  }, [videoFailed, attempt]);

  const onVideoEnded = useCallback(() => {
    videoDoneRef.current = true;
    maybeHandOff();
  }, [maybeHandOff]);

  const onVideoError = useCallback(() => {
    if (videoRetriesRef.current < MAX_VIDEO_RETRIES) {
      videoRetriesRef.current += 1;
      const v = videoRef.current;
      if (v) {
        // Retry loading the same source.
        v.load();
        void v.play().catch(() => {});
      }
      return;
    }
    // Give up on the video → fall back to the branded loader, but let the
    // init pipeline drive the hand-off so the user is never stuck.
    videoDoneRef.current = true;
    setVideoFailed(true);
    maybeHandOff();
  }, [maybeHandOff]);

  const showFallbackLoader = videoFailed && !offline;

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        fontFamily: FONT_FAMILY,
        overflow: "hidden",
      }}
    >
      {/* Intro video */}
      {!videoFailed && (
        <video
          ref={videoRef}
          src={introVideo.url}
          poster={introPoster.url}
          autoPlay
          playsInline
          preload="auto"
          // eslint-disable-next-line react/no-unknown-property
          disablePictureInPicture
          controls={false}
          onEnded={onVideoEnded}
          onError={onVideoError}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "#000",
            pointerEvents: "none",
            opacity: fading ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease`,
          }}
        />
      )}

      {/* Minimal branded fallback loader (video unavailable) */}
      {showFallbackLoader && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: APP_BACKGROUND,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: fading ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease`,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <BrandLogo className="cm-splash-logo" size={84} showWordmark={false} eager />
            <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[4] }}>
              Coligo
            </Text>
          </div>
        </div>
      )}

      {/* Connectivity recovery overlay */}
      {offline && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: APP_BACKGROUND,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: spacing[4],
          }}
        >
          <GlassPanel style={{ padding: spacing[5], width: "100%", maxWidth: 360, textAlign: "center" }}>
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
                onClick={() => {
                  handedOffRef.current = false;
                  setAttempt((a) => a + 1);
                }}
              >
                Retry now
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

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
