// ============================================================================
// /profile — the user's identity hub. Live overview of their public profile:
// header (primary photo, name, age, college, department, semester, grad year),
// completion ring, real stats, photo gallery and interests. Every value comes
// from Supabase; realtime keeps it synced with edits and every other module.
// Design-system only.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Eye,
  Settings as SettingsIcon,
  GraduationCap,
  Sparkles,
  Camera,
  Image as ImageIcon,
  ChevronRight,
} from "lucide-react";

import {
  fullProfileQuery,
  profileGalleryQuery,
  myInterestsQuery,
  profileStatsQuery,
  profileCompletionQuery,
} from "@/lib/profile-full.functions";
import { useProfileRealtime } from "@/lib/use-profile-realtime";
import { colors, spacing, radii, surfaces, shadows } from "@/lib/ds";
import { Text, Avatar, Button, Skeleton, ProgressBar, Badge } from "@/components/ds/glass";
import { Card, CardBody, StatCard } from "@/components/ds/card";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/profile/")({
  head: () => ({ meta: [{ title: "Your profile — Coligo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(fullProfileQuery());
    context.queryClient.ensureQueryData(profileGalleryQuery());
    context.queryClient.ensureQueryData(myInterestsQuery());
    context.queryClient.ensureQueryData(profileStatsQuery());
    context.queryClient.ensureQueryData(profileCompletionQuery());
  },
  pendingComponent: ProfileSkeleton,
  errorComponent: ProfileError,
  component: ProfilePage,
});

function memberSinceLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function ProfilePage() {
  const navigate = useNavigate();
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  const { data: gallery } = useSuspenseQuery(profileGalleryQuery());
  const { data: interests } = useSuspenseQuery(myInterestsQuery());
  const { data: stats } = useSuspenseQuery(profileStatsQuery());
  const { data: completion } = useSuspenseQuery(profileCompletionQuery());

  useProfileRealtime(profile?.id);

  if (!profile) {
    return (
      <DiscoverShell active="profile">
        <TopBar title="Profile" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
          <EmptyStateFromPreset preset="error" onPrimary={() => navigate({ to: "/home" })} />
        </div>
      </DiscoverShell>
    );
  }

  const name = profile.fullName ?? profile.displayName ?? "You";
  const cls = profile.graduationYear ? `Class of '${String(profile.graduationYear).slice(-2)}` : null;
  const meta = [profile.departmentName, cls, profile.semester ? `Semester ${profile.semester}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <DiscoverShell active="profile">
      <TopBar
        title="Profile"
        trailing={
          <button
            aria-label="Settings"
            onClick={() => navigate({ to: "/settings" })}
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, color: colors.primary }}
          >
            <SettingsIcon style={{ width: 22, height: 22 }} />
          </button>
        }
      />

      {/* Header card */}
      <Card style={{ marginTop: spacing[3] }}>
        <CardBody>
          <div className="flex items-center" style={{ gap: spacing[3] }}>
            <span className="shrink-0">
              <Avatar
                src={profile.avatarUrl ?? undefined}
                initials={name.slice(0, 1).toUpperCase()}
                size="lg"
                ring
                verified={profile.verificationStatus === "verified"}
              />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center" style={{ gap: spacing[1] }}>
                <Text variant="headingSm" truncate style={{ flex: 1, minWidth: 0 }}>
                  {name}
                  {profile.age ? `, ${profile.age}` : ""}
                </Text>
                {profile.verificationStatus === "verified" && <Badge tone="success">Verified</Badge>}
              </div>
              {profile.collegeName && (
                <div className="flex items-center" style={{ gap: 5, marginTop: 2, color: colors.textSecondary }}>
                  <GraduationCap style={{ width: 15, height: 15 }} />
                  <Text variant="bodySm" tone="secondary" truncate>
                    {profile.collegeName}
                  </Text>
                </div>
              )}
              {meta && (
                <Text variant="caption" tone="muted" truncate style={{ marginTop: 2 }}>
                  {meta}
                </Text>
              )}
            </div>
          </div>

          {/* Completion */}
          <div style={{ marginTop: spacing[4] }}>
            <div className="flex items-center justify-between" style={{ marginBottom: spacing[1] }}>
              <Text variant="caption" tone="muted">
                Profile completion
              </Text>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: 700 }}>
                {completion.percent}%
              </Text>
            </div>
            <ProgressBar value={completion.percent} />
            {completion.missing.length > 0 && (
              <Text variant="caption" tone="muted" style={{ display: "block", marginTop: spacing[1] }}>
                Next: {completion.missing[0]}
              </Text>
            )}
          </div>

          <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[3] }}>
            <Button
              variant="primary"
              fullWidth
              size="sm"
              onClick={() => navigate({ to: "/profile/edit" })}
              leftIcon={<Pencil style={{ width: 14, height: 14 }} />}
            >
              Edit
            </Button>
            <Button
              variant="glass"
              fullWidth
              size="sm"
              onClick={() => navigate({ to: "/profile/preview" })}
              leftIcon={<Eye style={{ width: 14, height: 14 }} />}
            >
              Preview
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[2], marginTop: spacing[3] }}>
        <StatCard label="Matches" value={stats.totalMatches} padding={spacing[3]} />
        <StatCard label="Chats" value={stats.totalChats} padding={spacing[3]} />
        <StatCard label="Member" value={memberSinceLabel(stats.memberSince)} padding={spacing[3]} />
      </div>

      {/* Gallery */}
      <div className="flex items-center justify-between" style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
        <Text variant="headingSm">Photos</Text>
        <button
          onClick={() => navigate({ to: "/profile/photos" })}
          className="ds-press inline-flex items-center"
          style={{ gap: 4, color: colors.primary, fontSize: 14, fontWeight: 600 }}
        >
          Manage <ChevronRight style={{ width: 15, height: 15 }} />
        </button>
      </div>
      {gallery.length === 0 ? (
        <Card>
          <CardBody>
            <button
              onClick={() => navigate({ to: "/profile/photos" })}
              className="ds-press flex w-full items-center justify-center"
              style={{ gap: spacing[2], padding: spacing[4], color: colors.textMuted }}
            >
              <Camera style={{ width: 20, height: 20 }} />
              <Text variant="bodySm" tone="muted">
                Add your first photo
              </Text>
            </button>
          </CardBody>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[2] }}>
          {gallery.map((p) => (
            <div
              key={p.id}
              style={{
                position: "relative",
                aspectRatio: "3 / 4",
                borderRadius: radii.md,
                overflow: "hidden",
                background: surfaces.glassSoft,
                border: `1px solid ${surfaces.borderSoft}`,
                boxShadow: shadows.soft,
              }}
            >
              {p.url ? (
                <img
                  src={p.url}
                  alt="Profile"
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ color: colors.textMuted }}>
                  <ImageIcon style={{ width: 20, height: 20 }} />
                </div>
              )}
              {p.isPrimary && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    padding: "2px 8px",
                    borderRadius: radii.pill,
                    background: colors.primary,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interests */}
      <div className="flex items-center justify-between" style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
        <Text variant="headingSm">Interests</Text>
        <button
          onClick={() => navigate({ to: "/profile/interests" })}
          className="ds-press inline-flex items-center"
          style={{ gap: 4, color: colors.primary, fontSize: 14, fontWeight: 600 }}
        >
          Manage <ChevronRight style={{ width: 15, height: 15 }} />
        </button>
      </div>
      {interests.length === 0 ? (
        <Card>
          <CardBody>
            <Text variant="bodySm" tone="muted">
              Add interests so students with common ground find you.
            </Text>
          </CardBody>
        </Card>
      ) : (
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
      )}

      {/* Quick links */}
      <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        <Button variant="glass" fullWidth size="sm" onClick={() => navigate({ to: "/profile/bio" })}>
          Edit bio
        </Button>
        <Button variant="glass" fullWidth size="sm" onClick={() => navigate({ to: "/profile/preferences" })}>
          Preferences
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function ProfileSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Profile" />
      <Skeleton style={{ height: 210, borderRadius: 24, marginTop: spacing[3] }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[2], marginTop: spacing[3] }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 90, borderRadius: 18 }} />
        ))}
      </div>
      <Skeleton style={{ height: 24, width: 120, borderRadius: 8, marginTop: spacing[5] }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[2], marginTop: spacing[2] }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ aspectRatio: "3 / 4", borderRadius: 18 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function ProfileError() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Profile" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset
          preset="error"
          onPrimary={() => qc.invalidateQueries({ queryKey: fullProfileQuery().queryKey })}
          onSecondary={() => navigate({ to: "/home" })}
        />
      </div>
    </DiscoverShell>
  );
}
