// ============================================================================
// /home layout — post-auth guard + shell for the Home module.
// Confirms onboarding is complete (incomplete members go back to Onboarding),
// then renders the matched child route (dashboard, rankings, college detail).
// ============================================================================
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { myProfileQuery } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/home")({
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(myProfileQuery());
    if (!profile?.onboardingCompleted) {
      throw redirect({ to: "/onboarding" });
    }
    return profile;
  },
  component: () => <Outlet />,
});
