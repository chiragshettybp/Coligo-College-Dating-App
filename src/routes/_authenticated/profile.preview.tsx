// ============================================================================
// /profile/preview — shows the user exactly how other students see them in
// Discovery. Reuses the same PhotoCarousel + card layout as the discovery
// profile view, sourced from the user's own live data. Read-only; updates
// instantly when the profile changes (shared query cache + realtime).
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, GraduationCap, Sparkles, ShieldCheck } from "lucide-react";

import {
  fullProfileQuery,
  profileGalleryQuery,
  myInterestsQuery,
} from "@/lib/profile-full.functions";
import { useProfileRealtime } from "@/lib/use-profile-realtime";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Badge, Button, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { PhotoCarousel } from "@/components/ds/swipe";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/profile/preview")({
  head: () => ({ meta: [{ title: "Preview profile — Coligo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(fullProfileQuery());
    context.queryClient.ensureQueryData(profileGalleryQuery());
    context.queryClient.ensureQueryData(myInterestsQuery());
  },
  pendingComponent: PreviewSkeleton,
  errorComponent: PreviewError,
  component: PreviewPage,
});

function PreviewPage() {
  const navigate = useNavigate();
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  const { data: gallery } = useSuspenseQuery(profileGalleryQuery());
  const { data: interests } = useSuspenseQuery(myInterestsQuery());

  useProfileRealtime(profile?.id);

  if (!profile) return <PreviewError />;

  const photos = gallery.map((p) => p.url).filter((u): u is string => !!u);
  const cls = profile.graduationYear ? `Class of '${String(profile.graduationYear).slice(-2)}` : null;
  const verified = profile.verificationStatus === "verified";

  return (
    <DiscoverShell active="profile">
      <div className="flex items-center justify-between" style={{ gap: spacing[2], marginBottom: spacing[3] }}>
        <Button
          variant="glass"
          onClick={() => navigate({ to: "/profile" })}
          leftIcon={<ChevronLeft style={{ width: 18, height: 18 }} />}
        >
          Back
        </Button>
        <Badge tone="info">Preview</Badge>
      </div>

      <PhotoCarousel photos={photos} height={480} />

      <div style={{ marginTop: spacing[4] }}>
        <div className="flex items-center" style={{ gap: spacing[2] }}>
          <Text variant="headingLg">
            {profile.fullName ?? "You"}
            {profile.age ? `, ${profile.age}` : ""}
          </Text>
          {verified && (
            <Badge tone="success">
              <ShieldCheck style={{ width: 12, height: 12 }} /> Verified
            </Badge>
          )}
        </div>

        {(profile.departmentName || cls) && (
          <div className="mt-1 flex items-center gap-1.5" style={{ color: colors.textSecondary, fontSize: 14 }}>
            <GraduationCap style={{ width: 15, height: 15 }} />
            {[profile.departmentName, cls].filter(Boolean).join(" · ")}
          </div>
        )}
        {profile.collegeName && (
          <Text variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
            {profile.collegeName}
            {profile.semester ? ` · Semester ${profile.semester}` : ""}
          </Text>
        )}
      </div>

      {profile.bio && (
        <Card style={{ marginTop: spacing[4] }}>
          <CardBody>
            <Text variant="bodySm" tone="secondary" style={{ whiteSpace: "pre-wrap" }}>
              {profile.bio}
            </Text>
          </CardBody>
        </Card>
      )}

      {interests.length > 0 && (
        <div style={{ marginTop: spacing[4] }}>
          <Text variant="headingSm" style={{ marginBottom: spacing[2] }}>
            Interests
          </Text>
          <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
            {interests.map((it) => (
              <span
                key={it.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 12px",
                  borderRadius: radii.pill,
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.textSecondary,
                  background: surfaces.glass,
                  border: `1px solid ${surfaces.border}`,
                }}
              >
                <Sparkles style={{ width: 12, height: 12, color: colors.primary }} />
                {it.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button variant="primary" fullWidth onClick={() => navigate({ to: "/profile/edit" })} style={{ marginTop: spacing[6] }}>
        Edit profile
      </Button>
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function PreviewSkeleton() {
  return (
    <DiscoverShell active="profile">
      <Skeleton style={{ height: 40, width: 96, borderRadius: 999, marginBottom: spacing[3] }} />
      <Skeleton style={{ height: 480, borderRadius: 24 }} />
      <Skeleton style={{ height: 28, width: 200, borderRadius: 8, marginTop: spacing[4] }} />
      <Skeleton style={{ height: 80, borderRadius: 16, marginTop: spacing[4] }} />
    </DiscoverShell>
  );
}

function PreviewError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset preset="error" onPrimary={() => navigate({ to: "/profile" })} />
      </div>
    </DiscoverShell>
  );
}
