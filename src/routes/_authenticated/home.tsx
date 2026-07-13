// ============================================================================
// /home layout — post-auth guard + shell for the Home module.
// Confirms onboarding is complete (incomplete members go back to Onboarding),
// then renders the matched child route (dashboard, rankings, college detail).
// ============================================================================
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireCompletedOnboarding } from "@/lib/route-guards";
import { RouteFallback } from "@/components/system/RouteFallback";

export const Route = createFileRoute("/_authenticated/home")({
  loader: ({ context }) => requireCompletedOnboarding(context.queryClient),
  pendingComponent: RouteFallback,
  component: () => <Outlet />,
});
