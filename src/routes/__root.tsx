import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { NotFoundView } from "@/components/system/NotFoundView";
import { ServerErrorView } from "@/components/system/ServerErrorView";

function NotFoundComponent() {
  return <NotFoundView />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return <ServerErrorView error={error} reset={reset} />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CampusMatch — Dating for verified college students" },
      {
        name: "description",
        content:
          "CampusMatch is the exclusive dating app for verified college students in India. Match and chat with students from your campus.",
      },
      { name: "author", content: "CampusMatch" },
      { property: "og:title", content: "CampusMatch — Dating for verified college students" },
      {
        property: "og:description",
        content:
          "CampusMatch is the exclusive dating app for verified college students in India. Match and chat with students from your campus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Enforce "Remember me": if the last sign-in was marked ephemeral and this
    // is a fresh browser launch (no sessionStorage marker), end the session.
    if (typeof window !== "undefined") {
      if (localStorage.getItem("cm:ephemeral") === "1" && !sessionStorage.getItem("cm:session")) {
        supabase.auth.signOut();
      } else if (localStorage.getItem("cm:ephemeral") === "1") {
        sessionStorage.setItem("cm:session", "1");
      }
    }

    // Single source of truth for auth transitions across tabs.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    // Realtime maintenance detection: when an admin toggles maintenance, drop
    // cached config and re-run route guards so the app diverts without a manual
    // refresh (the _authenticated gate redirects to the maintenance page).
    const maintenanceChannel = supabase
      .channel("root_application_settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "application_settings" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["system", "app-config"] });
          router.invalidate();
        },
      )
      .subscribe();

    return () => {
      data.subscription.unsubscribe();
      void supabase.removeChannel(maintenanceChannel);
    };
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
