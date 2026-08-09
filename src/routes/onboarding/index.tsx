// /onboarding — resume: send the member to their saved step (or complete).
import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useOnboardingState } from "@/components/onboarding/useOnboarding";
import { ONBOARDING_STEPS, maxAllowedIndex } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding/")({
  head: () => ({
    meta: [
      { title: "Complete your Coligo Profile — Verified Student Dating" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OnboardingResume,
});

function OnboardingResume() {
  const state = useOnboardingState();
  if (state.onboardingCompleted) return <Navigate to="/home" replace />;
  const target = ONBOARDING_STEPS[maxAllowedIndex(state.onboardingStep)];
  return <Navigate to={`/onboarding/${target}`} replace />;
}
