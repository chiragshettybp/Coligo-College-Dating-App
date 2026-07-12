// ============================================================================
// /matches/:matchId — full detail for a single mutual match. Loads the
// participant profile via match_detail (validates ownership; null for invalid,
// deleted, blocked or removed accounts). Actions: Open Chat, Send Note, View
// Full Profile, Unmatch, Block, Report. Realtime keeps online + profile fresh.
// ============================================================================
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  PenLine,
  UserRound,
  Ban,
  Flag,
  HeartOff,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { matchDetailQuery } from "@/lib/matches.functions";
import { myProfileQuery } from "@/lib/profile.functions";
import { useOnlineUserIds } from "@/lib/use-presence-set";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Badge, Button, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { PhotoCarousel } from "@/components/ds/swipe";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/matches/$matchId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(matchDetailQuery(params.matchId)),
  pendingComponent: DetailSkeleton,
  errorComponent: DetailUnavailable,
  component: MatchDetailPage,
});

function lastActive(iso: string | null, online: boolean): string {
  if (online) return "Online now";
  if (!iso) return "Offline";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Active ${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  return `Active ${Math.floor(hrs / 24)}d ago`;
}

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: match } = useSuspenseQuery(matchDetailQuery(matchId));
  const { data: profile } = useSuspenseQuery(myProfileQuery());
  const onlineIds = useOnlineUserIds(profile?.id ?? null);

  const otherId = match?.other.id ?? null;

  // Realtime: profile edits + new messages refresh detail; unmatch/block by the
  // other side flips the row out of the active set → detail becomes unavailable.
  useEffect(() => {
    if (!profile?.id) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: matchDetailQuery(matchId).queryKey });
    const channel = supabase
      .channel(`match-detail:${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "blocks" }, invalidate)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, matchId, qc]);

  if (!match) return <DetailUnavailable />;

  const { other } = match;
  const name = other.fullName ?? "Someone";
  const online = otherId ? onlineIds.has(otherId) : false;
  const cls = other.graduationYear ? `Class of '${String(other.graduationYear).slice(-2)}` : null;
  const mutual = new Set(other.mutualInterests);

  const openChat = () => navigate({ to: "/matches/$matchId/note", params: { matchId } });

  return (
    <DiscoverShell active="matches">
      <TopBar title="Match" onBack={() => navigate({ to: "/matches" })} />

      <div style={{ marginTop: spacing[3] }}>
        <PhotoCarousel photos={other.photos} height={460} />
      </div>

      <div style={{ marginTop: spacing[4] }}>
        <div className="flex items-center" style={{ gap: spacing[2] }}>
          <Text variant="headingLg">
            {name}
            {other.age ? `, ${other.age}` : ""}
          </Text>
          <Badge tone="success">
            <ShieldCheck style={{ width: 12, height: 12 }} /> Verified
          </Badge>
        </div>

        <div
          className="flex items-center"
          style={{ gap: 6, marginTop: 4, color: online ? colors.success : colors.textMuted, fontSize: 13, fontWeight: 600 }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: online ? colors.success : colors.textMuted,
              boxShadow: online ? `0 0 8px ${colors.success}` : "none",
            }}
          />
          {lastActive(other.lastLoginAt, online)}
        </div>

        {(other.departmentName || cls) && (
          <div className="mt-2 flex items-center gap-1.5" style={{ color: colors.textSecondary, fontSize: 14 }}>
            <GraduationCap style={{ width: 15, height: 15 }} />
            {[other.departmentName, cls].filter(Boolean).join(" · ")}
          </div>
        )}
        {other.collegeName && (
          <Text variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
            {other.collegeName}
            {other.sameCollege ? " · Same campus" : ""}
            {other.semester ? ` · Semester ${other.semester}` : ""}
          </Text>
        )}
        <Text variant="caption" tone="muted" style={{ marginTop: 4, display: "block" }}>
          Matched {new Date(match.createdAt).toLocaleDateString()}
        </Text>
      </div>

      {/* Primary actions */}
      <div className="flex items-center" style={{ gap: spacing[3], marginTop: spacing[5] }}>
        <Button
          variant="primary"
          fullWidth
          onClick={openChat}
          leftIcon={<MessageCircle style={{ width: 18, height: 18 }} />}
        >
          Open Chat
        </Button>
        {!match.noteSent && (
          <Button
            variant="glass"
            onClick={() => navigate({ to: "/matches/$matchId/note", params: { matchId } })}
            leftIcon={<PenLine style={{ width: 18, height: 18 }} />}
          >
            Note
          </Button>
        )}
      </div>

      {other.bio && (
        <Card style={{ marginTop: spacing[4] }}>
          <CardBody>
            <Text variant="bodySm" tone="secondary" style={{ whiteSpace: "pre-wrap" }}>
              {other.bio}
            </Text>
          </CardBody>
        </Card>
      )}

      {other.interests.length > 0 && (
        <div style={{ marginTop: spacing[4] }}>
          <Text variant="headingSm" style={{ marginBottom: spacing[2] }}>
            Interests
            {other.mutualInterests.length > 0 && (
              <Text as="span" variant="caption" tone="muted" style={{ marginLeft: 8 }}>
                {other.mutualInterests.length} in common
              </Text>
            )}
          </Text>
          <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
            {other.interests.map((it) => {
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

      {/* Secondary actions */}
      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[6] }}>
        <Button
          variant="glass"
          fullWidth
          onClick={() =>
            navigate({ to: "/discover/profile/$userId", params: { userId: other.id } })
          }
          leftIcon={<UserRound style={{ width: 18, height: 18 }} />}
        >
          View Full Profile
        </Button>
        <div className="flex items-center" style={{ gap: spacing[2] }}>
          <Button
            variant="glass"
            fullWidth
            onClick={() => navigate({ to: "/matches/$matchId/report", params: { matchId } })}
            leftIcon={<Flag style={{ width: 17, height: 17 }} />}
          >
            Report
          </Button>
          <Button
            variant="glass"
            fullWidth
            onClick={() => navigate({ to: "/matches/$matchId/block", params: { matchId } })}
            leftIcon={<Ban style={{ width: 17, height: 17 }} />}
          >
            Block
          </Button>
        </div>
        <Button
          variant="danger"
          fullWidth
          onClick={() => navigate({ to: "/matches/$matchId/unmatch", params: { matchId } })}
          leftIcon={<HeartOff style={{ width: 18, height: 18 }} />}
        >
          Unmatch
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function DetailSkeleton() {
  return (
    <DiscoverShell active="matches">
      <TopBar title="Match" />
      <Skeleton style={{ height: 460, borderRadius: 24, marginTop: spacing[3] }} />
      <Skeleton style={{ height: 30, width: 220, borderRadius: 8, marginTop: spacing[4] }} />
      <Skeleton style={{ height: 80, borderRadius: 16, marginTop: spacing[4] }} />
    </DiscoverShell>
  );
}

function DetailUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <TopBar title="Match" onBack={() => navigate({ to: "/matches" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="search"
          tone="slate"
          title="Match unavailable"
          description="This match can't be shown right now — it may have been unmatched, blocked, or the account was removed."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/matches" })}>
              Back to matches
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
