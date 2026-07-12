// ============================================================================
// /settings/delete-account — permanent account deletion (no popup). Explains
// consequences, requires typing DELETE to confirm, accepts optional feedback,
// then runs the privileged deleteMyAccount server function (purges storage,
// sessions and the auth user) before signing out and returning to landing.
// ============================================================================
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteMyAccount } from "@/lib/settings-account.functions";
import { supabase } from "@/integrations/supabase/client";
import { colors, spacing, surfaces, radii } from "@/lib/ds";
import { Text, Button, TextField } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/delete-account")({
  head: () => ({
    meta: [{ title: "Delete account — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  component: DeleteAccountPage,
});

const CONSEQUENCES = [
  "Your profile, photos and bio will be permanently removed.",
  "All your matches and conversations will be deleted.",
  "You'll disappear from Discovery for everyone.",
  "This action cannot be undone.",
];

function DeleteAccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const run = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const canDelete = confirm.trim().toUpperCase() === "DELETE";

  const onConfirm = async () => {
    if (!canDelete) return;
    setBusy(true);
    try {
      await run({ data: { feedback: feedback.trim() || undefined } });
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete your account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <DiscoverShell active="profile">
      <TopBar title="Delete account" onBack={() => navigate({ to: "/settings" })} />

      <div className="flex flex-col items-center" style={{ marginTop: spacing[6], textAlign: "center" }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 72, height: 72, borderRadius: 999, background: "rgba(255,59,48,0.10)" }}
        >
          <Trash2 style={{ width: 30, height: 30, color: colors.danger }} />
        </div>
        <Text variant="headingLg" style={{ marginTop: spacing[4] }}>
          Delete your account?
        </Text>
      </div>

      <Card style={{ marginTop: spacing[5] }}>
        <CardBody>
          <div className="flex flex-col" style={{ gap: spacing[2] }}>
            {CONSEQUENCES.map((c) => (
              <div key={c} className="flex items-start" style={{ gap: spacing[2] }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: colors.danger,
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <Text variant="bodySm" tone="secondary">
                  {c}
                </Text>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col" style={{ gap: spacing[3], marginTop: spacing[5] }}>
        <label className="block">
          <span
            className="mb-1.5 block"
            style={{ color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}
          >
            Feedback (optional)
          </span>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Tell us why you're leaving — this helps us improve Coligo."
            className="w-full outline-none"
            style={{
              borderRadius: radii.md,
              padding: "12px 16px",
              fontSize: 15,
              background: surfaces.glassSoft,
              border: `1px solid ${surfaces.border}`,
              color: colors.textPrimary,
              resize: "none",
            }}
          />
        </label>

        <TextField
          label={'Type "DELETE" to confirm'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          autoCapitalize="characters"
        />
      </div>

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[5] }}>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          disabled={!canDelete}
          onClick={onConfirm}
          leftIcon={<Trash2 style={{ width: 18, height: 18 }} />}
        >
          Delete my account
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
