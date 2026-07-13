// ============================================================================
// Shared route-guard helpers for authenticated module layouts.
// Centralizes the "member must have finished onboarding" check so every module
// (Home, Discover, Matches, …) enforces it identically. Keeping this in one
// place means a change to the guard rule updates every module at once.
// ============================================================================
import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { myProfileQuery } from "@/lib/profile.functions";

/**
 * Ensures the current member has completed onboarding, redirecting to
 * /onboarding otherwise. Returns the loaded profile so route loaders can pass
 * it straight through.
 */
export async function requireCompletedOnboarding(queryClient: QueryClient) {
  const profile = await queryClient.ensureQueryData(myProfileQuery());
  if (!profile?.onboardingCompleted) {
    throw redirect({ to: "/onboarding" });
  }
  return profile;
}
