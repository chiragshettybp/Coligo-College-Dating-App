// ============================================================================
// Protected route layout — integration-managed gate.
// ssr:false because the Supabase session lives in localStorage (unreadable on
// the server). Unauthenticated users go to login; when maintenance is active,
// even authenticated users are diverted (session preserved) to the
// maintenance page.
// ============================================================================
import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { getAppConfig } from "@/lib/system.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth/login" });
    }
    try {
      const config = await getAppConfig();
      if (config.maintenanceEnabled) {
        throw redirect({ to: "/system/maintenance" });
      }
    } catch (e) {
      // Re-throw redirects; ignore config fetch failures so a transient
      // network hiccup never locks a signed-in user out of the app.
      if (isRedirect(e)) throw e;
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
