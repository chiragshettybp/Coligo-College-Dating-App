// ============================================================================
// /discover layout — post-auth guard + shell for the Discovery module.
// Confirms onboarding is complete (incomplete members go back to Onboarding),
// then renders the matched child route (feed, profile preview, match, empty).
// ============================================================================
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireCompletedOnboarding } from "@/lib/route-guards";
import { RouteFallback } from "@/components/system/RouteFallback";

export const Route = createFileRoute("/_authenticated/discover")({
  loader: ({ context }) => requireCompletedOnboarding(context.queryClient),
  pendingComponent: RouteFallback,
  component: () => <Outlet />,
});
