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
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error, reset }) => (
      <ServerErrorView error={error} reset={reset} />
    ),
    defaultNotFoundComponent: () => <NotFoundView />,
  });

  return router;
};
