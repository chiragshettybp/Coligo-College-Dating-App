// ============================================================================
// /404 — explicit not-found route (also reachable via direct navigation).
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";

import { NotFoundView } from "@/components/system/NotFoundView";

export const Route = createFileRoute("/404")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Page Not Found — Coligo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotFoundView,
});
