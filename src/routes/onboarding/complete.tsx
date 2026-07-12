// /onboarding/complete — finalize onboarding, then hand off to the app home.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Check, AlertCircle } from "lucide-react";

import { completeOnboarding } from "@/lib/onboarding.functions";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { colors, spacing, radii, gradients } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/onboarding/complete")({
  head: () => ({ meta: [{ title: "You're all set — CampusMatch" }, { name: "robots", content: "noindex" }] }),
  component: CompleteStep,
});

function CompleteStep() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const finish = useServerFn(completeOnboarding);
  const ran = useRef(false);
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        await finish({ data: undefined });
        await queryClient.invalidateQueries({ queryKey: ["onboarding", "state"] });
        await queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
        haptic("softSuccess");
        setStatus("done");
      } catch (e) {
        haptic("medium");
        setError(e instanceof Error ? e.message : "Couldn't finish setup.");
        setStatus("error");
      }
    })();
  }, [finish, queryClient]);

  // Auto-advance to the app shortly after success.
  useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(() => navigate({ to: "/app", replace: true }), 1800);
    return () => clearTimeout(t);
  }, [status, navigate]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
      <GlassPanel style={{ padding: spacing[6] }}>
        {status === "error" ? (
          <>
            <span
              aria-hidden
              className="inline-flex items-center justify-center"
              style={{ width: 72, height: 72, borderRadius: radii.pill, background: "rgba(255,59,48,0.12)", color: colors.danger, margin: "0 auto" }}
            >
              <AlertCircle style={{ width: 34, height: 34 }} />
            </span>
            <Text variant="headingLg" color={colors.textPrimary} style={{ marginTop: spacing[4] }}>
              Almost there
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
              {error}
            </Text>
            <div style={{ marginTop: spacing[5] }}>
              <Button variant="primary" fullWidth onClick={() => navigate({ to: "/onboarding" })}>
                Review my details
              </Button>
            </div>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className="inline-flex items-center justify-center cm-complete-check"
              style={{ width: 84, height: 84, borderRadius: radii.pill, background: gradients.success, color: "#fff", margin: "0 auto" }}
            >
              <Check style={{ width: 42, height: 42 }} strokeWidth={3} />
            </span>
            <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[5] }}>
              You're all set!
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
              {status === "done"
                ? "Your profile is ready. Time to meet verified students on your campus."
                : "Finalizing your profile…"}
            </Text>
            <div style={{ marginTop: spacing[6] }}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={status === "working"}
                disabled={status === "working"}
                onClick={() => navigate({ to: "/app", replace: true })}
              >
                Start exploring
              </Button>
            </div>
          </>
        )}
      </GlassPanel>

      <style>{`
        @keyframes cm-pop { 0% { transform: scale(0.4); opacity: 0 } 60% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        .cm-complete-check { animation: cm-pop 460ms cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .cm-complete-check { animation: none; } }
      `}</style>
    </div>
  );
}
