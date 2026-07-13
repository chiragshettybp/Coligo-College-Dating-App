import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { NotFoundView } from "@/components/system/NotFoundView";
import { ServerErrorView } from "@/components/system/ServerErrorView";

export const getRouter = () => {
  const queryClient = new QueryClient();

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
