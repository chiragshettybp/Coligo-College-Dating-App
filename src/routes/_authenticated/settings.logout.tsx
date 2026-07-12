// ============================================================================
// /settings/logout — dedicated sign-out confirmation (no popup). Cancels
// in-flight queries, clears cached user data, ends the Supabase session and
// returns to the landing page. Sign-out propagates across tabs via the root
// onAuthStateChange listener.
// ============================================================================
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { spacing } from "@/lib/ds";
import { Text, Button } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/logout")({
  head: () => ({
    meta: [{ title: "Log out — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  component: LogoutPage,
});

function LogoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    setBusy(true);
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Couldn't log out. Please try again.");
      setBusy(false);
    }
  };

  return (
    <DiscoverShell active="profile">
      <TopBar title="Log out" onBack={() => navigate({ to: "/settings" })} />

      <div className="flex flex-col items-center" style={{ marginTop: spacing[6], textAlign: "center" }}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: "rgba(255,59,48,0.10)",
          }}
        >
          <LogOut style={{ width: 30, height: 30, color: "#ff3b30" }} />
        </div>
        <Text variant="headingLg" style={{ marginTop: spacing[4] }}>
          Log out of Coligo?
        </Text>
      </div>

      <Card style={{ marginTop: spacing[5] }}>
        <CardBody>
          <Text variant="bodySm" tone="secondary" align="center">
            You'll need to sign in again to access your matches, chats and profile.
            Your data stays safe.
          </Text>
        </CardBody>
      </Card>

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[6] }}>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          onClick={onConfirm}
          leftIcon={<LogOut style={{ width: 18, height: 18 }} />}
        >
          Log out
        </Button>
        <Button
          variant="glass"
          fullWidth
          disabled={busy}
          onClick={() => navigate({ to: "/settings" })}
        >
          Cancel
        </Button>
      </div>
    </DiscoverShell>
  );
}
