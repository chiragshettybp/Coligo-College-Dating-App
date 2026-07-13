import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { NotFoundView } from "@/components/system/NotFoundView";
import { ServerErrorView } from "@/components/system/ServerErrorView";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return <NotFoundView />;
}

/** Replays a subtle enter animation on each route change (unified page motion). */
function AnimatedOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="ds-page-in">
      <Outlet />
    </div>
  );
}

/** Announces route changes to screen readers via a polite live region. */
function RouteAnnouncer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [message, setMessage] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => {
      setMessage(document.title || `Navigated to ${pathname}`);
    }, 120);
    return () => window.clearTimeout(id);
  }, [pathname]);
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {message}
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return <ServerErrorView error={error} reset={reset} />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Coligo — Dating for verified college students" },
      {
        name: "description",
        content:
          "Coligo is the exclusive dating app for verified college students in India. Match and chat with students from your campus.",
      },
      { name: "author", content: "Coligo" },
      { property: "og:title", content: "Coligo — Dating for verified college students" },
      {
        property: "og:description",
        content:
          "Coligo is the exclusive dating app for verified college students in India. Match and chat with students from your campus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Coligo — Dating for verified college students" },
      { name: "twitter:description", content: "Coligo is the exclusive dating app for verified college students in India. Match and chat with students from your campus." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b168c64b-a6c8-4cea-859c-a20fe59d812a/id-preview-70e0ec70--9900e54b-f541-4340-8c39-bd8d6fca2142.lovable.app-1783866995850.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b168c64b-a6c8-4cea-859c-a20fe59d812a/id-preview-70e0ec70--9900e54b-f541-4340-8c39-bd8d6fca2142.lovable.app-1783866995850.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/coligo-32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/coligo-180.png" },
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
      <AnimatedOutlet />
      <Toaster />
    </QueryClientProvider>
  );
}
