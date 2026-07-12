// ============================================================================
// /discover layout — post-auth guard + shell for the Discovery module.
// Confirms onboarding is complete (incomplete members go back to Onboarding),
// then renders the matched child route (feed, profile preview, match, empty).
// ============================================================================
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { myProfileQuery } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/discover")({
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(myProfileQuery());
    if (!profile?.onboardingCompleted) {
      throw redirect({ to: "/onboarding" });
    }
    return profile;
  },
  component: () => <Outlet />,
});
