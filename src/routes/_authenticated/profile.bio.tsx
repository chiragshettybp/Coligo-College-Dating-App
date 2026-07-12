// ============================================================================
// /profile/bio — edit the biography. Multiline editor with live char counter,
// whitespace trimming and max-length validation. Persists to Supabase and
// syncs across Discovery and the profile preview via realtime.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  fullProfileQuery,
  updateBio,
  profileCompletionQuery,
} from "@/lib/profile-full.functions";
import { LIMITS } from "@/lib/onboarding";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Skeleton } from "@/components/ds/glass";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/profile/bio")({
  head: () => ({ meta: [{ title: "Edit bio — Coligo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fullProfileQuery()),
  pendingComponent: BioSkeleton,
  errorComponent: BioError,
  component: BioPage,
});

function BioPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  const save = useServerFn(updateBio);

  const [bio, setBio] = useState(profile?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const remaining = LIMITS.bioMax - bio.length;

  const mutation = useMutation({
    mutationFn: () => save({ data: { bio: bio.trim() } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: fullProfileQuery().queryKey });
      await qc.invalidateQueries({ queryKey: profileCompletionQuery().queryKey });
      toast.success("Bio updated");
      navigate({ to: "/profile" });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Couldn't save. Please try again."),
  });

  return (
    <DiscoverShell active="profile">
      <TopBar title="Edit bio" onBack={() => navigate({ to: "/profile" })} />

      <div style={{ marginTop: spacing[4] }}>
        <label>
          <span style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>
            About you
          </span>
          <textarea
            autoFocus
            value={bio}
            maxLength={LIMITS.bioMax}
            onChange={(e) => setBio(e.target.value)}
            rows={7}
            placeholder="Share something real — hobbies, what you're studying, a fun fact…"
            aria-label="Bio"
            style={{
              width: "100%",
              borderRadius: radii.md,
              padding: "13px 16px",
              fontSize: 16,
              fontWeight: 500,
              lineHeight: 1.5,
              color: colors.textPrimary,
              background: surfaces.glassSoft,
              border: `1px solid ${surfaces.border}`,
              outline: "none",
              resize: "vertical",
            }}
          />
        </label>
        <div style={{ textAlign: "right", marginTop: 6 }}>
          <Text variant="caption" tone="muted">
            {remaining} characters left
          </Text>
        </div>

        {error && (
          <Text variant="bodySm" style={{ color: colors.danger, marginTop: spacing[2] }}>
            {error}
          </Text>
        )}

        <Button
          variant="primary"
          fullWidth
          loading={mutation.isPending}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
          style={{ marginTop: spacing[4] }}
        >
          Save bio
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function BioSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Edit bio" />
      <Skeleton style={{ height: 180, borderRadius: 18, marginTop: spacing[4] }} />
    </DiscoverShell>
  );
}

function BioError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Edit bio" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset preset="error" onPrimary={() => navigate({ to: "/profile" })} />
      </div>
    </DiscoverShell>
  );
}
