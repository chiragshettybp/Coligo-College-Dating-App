// ============================================================================
// Protected landing / post-auth handoff (/app).
// This is where authentication ends and the next modules (Onboarding, Splash,
// Home) will take over. It confirms a live session and branches on whether the
// member has finished onboarding.
// ============================================================================
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, LogOut, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { myProfileQuery } from "@/lib/profile.functions";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, gradients } from "@/lib/ds";
import { formatPhoneIN } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app")({
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(myProfileQuery());
    // Members who haven't finished onboarding belong in the Onboarding module.
    if (!profile?.onboardingCompleted) {
      throw redirect({ to: "/onboarding" });
    }
    return profile;
  },
  component: AppHome,
});

function AppHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useSuspenseQuery(myProfileQuery());

  const onSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  };

  const onboardingDone = profile?.onboardingCompleted ?? false;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        backgroundAttachment: "fixed",
        fontFamily: FONT_FAMILY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing[4],
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div className="flex items-center" style={{ gap: spacing[1], marginBottom: spacing[5] }}>
          <span
            aria-hidden
            className="inline-flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: radii.md, background: gradients.primaryButton, color: "#fff" }}
          >
            <Heart style={{ width: 20, height: 20, fill: "currentColor" }} />
          </span>
          <Text variant="headingMd" color={colors.textPrimary}>
            CampusMatch
          </Text>
        </div>

        <GlassPanel style={{ padding: spacing[6] }}>
          <span
            aria-hidden
            className="inline-flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: radii.lg, background: gradients.pink, color: "#fff" }}
          >
            <Sparkles style={{ width: 26, height: 26 }} />
          </span>
          <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
            {onboardingDone ? "You're all set" : "Welcome to CampusMatch"}
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
            {onboardingDone
              ? "Your account is verified and ready. The Home experience continues in the next module."
              : "Your account is created. Complete onboarding next to start discovering verified students."}
          </Text>

          <div
            style={{
              marginTop: spacing[4],
              padding: spacing[3],
              borderRadius: radii.md,
              background: "rgba(10,132,255,0.06)",
            }}
          >
            <Text variant="caption" tone="muted">
              Signed in as
            </Text>
            <Text variant="title" color={colors.textPrimary} style={{ marginTop: 2 }}>
              +91 {profile?.phone ? formatPhoneIN(profile.phone) : "—"}
            </Text>
          </div>

          <div style={{ marginTop: spacing[5] }}>
            <Button variant="secondary" fullWidth leftIcon={<LogOut style={{ width: 18, height: 18 }} />} onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </GlassPanel>

        <Text variant="caption" tone="muted" style={{ display: "block", textAlign: "center", marginTop: spacing[4] }}>
          Onboarding, Splash and Home are delivered as separate modules and plug
          in here using the same session.
        </Text>
      </div>
    </div>
  );
}
