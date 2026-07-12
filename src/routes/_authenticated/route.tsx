// ============================================================================
// Protected route layout — integration-managed gate.
// ssr:false because the Supabase session lives in localStorage (unreadable on
// the server). Unauthenticated users are redirected to the login screen.
// ============================================================================
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth/login" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
