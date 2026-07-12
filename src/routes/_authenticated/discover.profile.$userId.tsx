// ============================================================================
// /discover/profile/:userId — full public profile before swiping. Reads a
// single eligible profile via the discover_profile RPC (owner-only RLS is
// bypassed server-side, then re-gated by eligibility). Like/Pass write through
// the same swipe RPC and keep the feed queue in sync so returning preserves
// order. Invalid / blocked / deleted profiles fall back gracefully.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronLeft, GraduationCap, Sparkles, ShieldCheck, X, Heart, Star } from "lucide-react";

import {
  discoverProfileQuery,
  discoveryFeedQuery,
  submitSwipe,
  type DiscoverCard,
  type SwipeAction,
} from "@/lib/discover.functions";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Badge, Button, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { PhotoCarousel } from "@/components/ds/swipe";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/discover/profile/$userId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(discoverProfileQuery(params.userId)),
  pendingComponent: ProfileSkeleton,
  errorComponent: ProfileUnavailable,
  component: ProfilePreviewPage,
});

function ProfilePreviewPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(discoverProfileQuery(userId));
  const swipeFn = useServerFn(submitSwipe);

  if (!profile) return <ProfileUnavailable />;

  const mutual = new Set(profile.mutualInterests);
  const cls = profile.graduationYear ? `Class of '${String(profile.graduationYear).slice(-2)}` : null;

  const decide = async (action: SwipeAction) => {
    // Keep the feed queue consistent: drop this profile from the cached feed.
    qc.setQueryData<DiscoverCard[]>(discoveryFeedQuery().queryKey, (old) =>
      (old ?? []).filter((c) => c.id !== userId),
    );
    try {
      const res = await swipeFn({ data: { targetId: userId, action } });
      if (res.matched && res.matchId) {
        navigate({ to: "/discover/match/$matchId", params: { matchId: res.matchId } });
        return;
      }
    } catch {
      toast.error("Couldn't save that. Please try again.");
    }
    navigate({ to: "/discover" });
  };

  return (
    <DiscoverShell active="discover">
      <div className="flex items-center" style={{ gap: spacing[2], marginBottom: spacing[3] }}>
        <Button variant="glass" onClick={() => navigate({ to: "/discover" })} leftIcon={<ChevronLeft style={{ width: 18, height: 18 }} />}>
          Back
        </Button>
      </div>

      <PhotoCarousel photos={profile.photos} height={480} />

      <div style={{ marginTop: spacing[4] }}>
        <div className="flex items-center" style={{ gap: spacing[2] }}>
          <Text variant="headingLg">
            {profile.fullName ?? "Someone"}
            {profile.age ? `, ${profile.age}` : ""}
          </Text>
          <Badge tone="success">
            <ShieldCheck style={{ width: 12, height: 12 }} /> Verified
          </Badge>
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
            {profile.sameCollege ? " · Same campus" : ""}
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

      {profile.interests.length > 0 && (
        <div style={{ marginTop: spacing[4] }}>
          <Text variant="headingSm" style={{ marginBottom: spacing[2] }}>
            Interests
          </Text>
          <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
            {profile.interests.map((it) => {
              const isMutual = mutual.has(it);
              return (
                <span
                  key={it}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: radii.pill,
                    fontSize: 13,
                    fontWeight: 600,
                    color: isMutual ? "#fff" : colors.textSecondary,
                    background: isMutual ? colors.success : surfaces.glass,
                    border: `1px solid ${isMutual ? "transparent" : surfaces.border}`,
                  }}
                >
                  {isMutual && <Sparkles style={{ width: 12, height: 12 }} />}
                  {it}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center" style={{ gap: spacing[3], marginTop: spacing[6] }}>
        <Button variant="glass" fullWidth onClick={() => decide("pass")} leftIcon={<X style={{ width: 18, height: 18 }} />}>
          Pass
        </Button>
        <Button variant="glass" onClick={() => decide("super")} leftIcon={<Star style={{ width: 18, height: 18 }} fill="currentColor" />}>
          Super
        </Button>
        <Button variant="primary" fullWidth onClick={() => decide("like")} leftIcon={<Heart style={{ width: 18, height: 18 }} fill="#fff" />}>
          Like
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function ProfileSkeleton() {
  return (
    <DiscoverShell active="discover">
      <Skeleton style={{ height: 40, width: 96, borderRadius: 999, marginBottom: spacing[3] }} />
      <Skeleton style={{ height: 480, borderRadius: 24 }} />
      <Skeleton style={{ height: 28, width: 200, borderRadius: 8, marginTop: spacing[4] }} />
      <Skeleton style={{ height: 80, borderRadius: 16, marginTop: spacing[4] }} />
    </DiscoverShell>
  );
}

function ProfileUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="discover">
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="search"
          tone="slate"
          title="Profile unavailable"
          description="This person isn't available to view right now — they may have paused discovery, blocked you, or left."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/discover" })}>
              Back to discovery
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
