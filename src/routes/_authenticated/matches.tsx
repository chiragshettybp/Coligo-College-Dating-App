// ============================================================================
// /matches layout — post-auth guard + shell for the Matches module. Confirms
// onboarding is complete (incomplete members go back to Onboarding), then
// renders the matched child route (dashboard, detail, note, confirm flows).
// ============================================================================
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { myProfileQuery } from "@/lib/profile.functions";
import { RouteFallback } from "@/components/system/RouteFallback";

export const Route = createFileRoute("/_authenticated/matches")({
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(myProfileQuery());
    if (!profile?.onboardingCompleted) {
      throw redirect({ to: "/onboarding" });
    }
    return profile;
  },
  pendingComponent: RouteFallback,
  component: () => <Outlet />,
});
