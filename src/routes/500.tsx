// ============================================================================
// /500 — explicit server-error route (also reachable via direct navigation).
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";

import { ServerErrorView } from "@/components/system/ServerErrorView";

export const Route = createFileRoute("/500")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Something went wrong — CampusMatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ServerErrorView />,
});
