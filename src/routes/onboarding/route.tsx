// ============================================================================
// Onboarding layout — gated shell for every /onboarding/* screen.
// ssr:false (session lives in localStorage). Verifies session, diverts on
// maintenance, loads onboarding state, then renders brand + progress + Back +
// the active step. Completed users are sent to /home; users cannot jump ahead of
// their saved progress (resume / anti-skip guard).
// ============================================================================
import {
  createFileRoute,
  Outlet,
  redirect,
  isRedirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getAppConfig } from "@/lib/system.functions";
import { onboardingStateQuery } from "@/lib/onboarding.functions";
import {
  ONBOARDING_STEPS,
  TOTAL_STEPS,
  stepIndex,
  prevStep,
  maxAllowedIndex,
  type OnboardingStep,
} from "@/lib/onboarding";
import { Text, ProgressBar } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, gradients } from "@/lib/ds";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth/login" });
    try {
      const config = await getAppConfig();
      if (config.maintenanceEnabled) throw redirect({ to: "/system/maintenance" });
    } catch (e) {
      if (isRedirect(e)) throw e;
    }
    return { user: data.user };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(onboardingStateQuery()),
  component: OnboardingLayout,
});

function currentStepFromPath(pathname: string): OnboardingStep | null {
  const seg = pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  return (ONBOARDING_STEPS as readonly string[]).includes(seg) ? (seg as OnboardingStep) : null;
}

function OnboardingLayout() {
  const navigate = useNavigate();
  const { data: state } = useSuspenseQuery(onboardingStateQuery());
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const step = currentStepFromPath(pathname);

  // Redirect completed users out of onboarding.
  useEffect(() => {
    if (state.onboardingCompleted) {
      navigate({ to: "/home", replace: true });
    }
  }, [state.onboardingCompleted, navigate]);

  // Anti-skip guard: never allow jumping ahead of saved progress.
  useEffect(() => {
    if (!step || state.onboardingCompleted) return;
    const allowed = maxAllowedIndex(state.onboardingStep);
    if (stepIndex(step) > allowed) {
      navigate({ to: `/onboarding/${ONBOARDING_STEPS[allowed]}`, replace: true });
    }
  }, [step, state.onboardingStep, state.onboardingCompleted, navigate]);

  const index = step ? stepIndex(step) : 0;
  const progress = step && step !== "complete" ? ((index + 1) / (TOTAL_STEPS - 1)) * 100 : 100;
  const canGoBack = step != null && index > 0 && step !== "complete";

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
      <div style={{ width: "100%", maxWidth: 460, flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          className="flex items-center"
          style={{ gap: spacing[2], paddingTop: spacing[1], paddingBottom: spacing[4] }}
        >
          {canGoBack ? (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => step && navigate({ to: `/onboarding/${prevStep(step)}` })}
              className="inline-flex items-center justify-center shrink-0 active:scale-95"
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.sm,
                background: "#fff",
                border: `1px solid ${colors.textMuted}22`,
                color: colors.textSecondary,
                cursor: "pointer",
              }}
            >
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </button>
          ) : (
            <span
              aria-hidden
              className="inline-flex items-center justify-center shrink-0"
              style={{ width: 40, height: 40, borderRadius: radii.sm, background: gradients.primaryButton, color: "#fff" }}
            >
              <Heart style={{ width: 20, height: 20, fill: "currentColor" }} />
            </span>
          )}

          <div style={{ flex: 1 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <Text variant="caption" tone="muted">
                {step && step !== "complete" ? `Step ${index + 1} of ${TOTAL_STEPS - 1}` : "Almost there"}
              </Text>
              <Text variant="caption" tone="muted">
                CampusMatch
              </Text>
            </div>
            <ProgressBar value={progress} />
          </div>
        </header>

        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
