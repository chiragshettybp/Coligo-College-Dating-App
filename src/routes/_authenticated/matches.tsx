// ============================================================================
// /matches layout — post-auth guard + shell for the Matches module. Confirms
// onboarding is complete (incomplete members go back to Onboarding), then
// renders the matched child route (dashboard, detail, note, confirm flows).
// ============================================================================
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireCompletedOnboarding } from "@/lib/route-guards";
import { RouteFallback } from "@/components/system/RouteFallback";

export const Route = createFileRoute("/_authenticated/matches")({
  loader: ({ context }) => requireCompletedOnboarding(context.queryClient),
  pendingComponent: RouteFallback,
  component: () => <Outlet />,
});
