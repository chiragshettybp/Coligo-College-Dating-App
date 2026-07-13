import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { NotFoundView } from "@/components/system/NotFoundView";
import { ServerErrorView } from "@/components/system/ServerErrorView";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Consistent freshness across the app: dedupe rapid refetches, but
        // always resync after the tab regains focus or the network reconnects
        // so no screen shows stale data.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: "always",
        retry: 2,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload route chunks + loader data on hover/touch-start so navigation
    // feels instant. defaultPreloadStaleTime: 0 lets TanStack Query own freshness.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error, reset }) => (
      <ServerErrorView error={error} reset={reset} />
    ),
    defaultNotFoundComponent: () => <NotFoundView />,
  });

  return router;
};
