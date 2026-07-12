// ============================================================================
// /chat/:chatId/info — conversation details. Profile, college, department,
// match date and shared-media count, plus actions: View Media, View Profile,
// Block, Report and Unmatch. Block / Unmatch reuse the existing dedicated
// confirmation pages (chatId === matchId).
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Images, UserRound, Ban, Flag, HeartOff, GraduationCap, CalendarDays } from "lucide-react";

import { chatInfoQuery } from "@/lib/chat.functions";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Avatar, Skeleton } from "@/components/ds/glass";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/chat/$chatId/info")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(chatInfoQuery(params.chatId)),
  pendingComponent: InfoSkeleton,
  errorComponent: InfoUnavailable,
  component: ChatInfoPage,
});

function ChatInfoPage() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const { data: info } = useSuspenseQuery(chatInfoQuery(chatId));

  if (!info) return <InfoUnavailable />;
  const { other } = info;
  const name = other.fullName ?? "your match";
  const meta = [other.collegeName, other.departmentName].filter(Boolean).join(" · ");
  const matchDate = new Date(info.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DiscoverShell active="matches">
      <TopBar title="Chat info" onBack={() => navigate({ to: "/chat/$chatId", params: { chatId } })} />

      <div className="flex flex-col items-center" style={{ marginTop: spacing[5], gap: spacing[2] }}>
        <Avatar src={other.photo ?? undefined} initials={name.slice(0, 1).toUpperCase()} size="xl" verified />
        <Text variant="headingLg" style={{ marginTop: spacing[2] }}>
          {name}
          {other.age ? `, ${other.age}` : ""}
        </Text>
        {meta && (
          <Text variant="body" tone="secondary" style={{ textAlign: "center" }}>
            {meta}
          </Text>
        )}
      </div>

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[5] }}>
        <InfoStat icon={<CalendarDays style={ICON} />} label="Matched" value={matchDate} />
        <InfoStat
          icon={<Images style={ICON} />}
          label="Shared media"
          value={`${info.sharedMediaCount} ${info.sharedMediaCount === 1 ? "photo" : "photos"}`}
        />
        {other.collegeName && (
          <InfoStat icon={<GraduationCap style={ICON} />} label="College" value={other.collegeName} />
        )}
      </div>

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[5] }}>
        <Button
          variant="glass"
          fullWidth
          leftIcon={<Images style={{ width: 18, height: 18 }} />}
          onClick={() => navigate({ to: "/chat/$chatId/media", params: { chatId } })}
        >
          View shared media
        </Button>
        <Button
          variant="glass"
          fullWidth
          leftIcon={<UserRound style={{ width: 18, height: 18 }} />}
          onClick={() => navigate({ to: "/discover/profile/$userId", params: { userId: other.id } })}
        >
          View profile
        </Button>
      </div>

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[6] }}>
        <Button
          variant="glass"
          fullWidth
          leftIcon={<Flag style={{ width: 18, height: 18 }} />}
          onClick={() => navigate({ to: "/chat/$chatId/report", params: { chatId } })}
        >
          Report {name.split(/\s+/)[0]}
        </Button>
        <Button
          variant="glass"
          fullWidth
          leftIcon={<Ban style={{ width: 18, height: 18 }} />}
          onClick={() => navigate({ to: "/matches/$matchId/block", params: { matchId: chatId } })}
        >
          Block {name.split(/\s+/)[0]}
        </Button>
        <Button
          variant="danger"
          fullWidth
          leftIcon={<HeartOff style={{ width: 18, height: 18 }} />}
          onClick={() => navigate({ to: "/matches/$matchId/unmatch", params: { matchId: chatId } })}
        >
          Unmatch
        </Button>
      </div>
    </DiscoverShell>
  );
}

const ICON = { width: 20, height: 20, color: colors.primary } as const;

function InfoStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: spacing[3],
        padding: spacing[3],
        borderRadius: radii.lg,
        background: surfaces.glass,
        border: `1px solid ${surfaces.borderSoft}`,
      }}
    >
      <span className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: radii.md, background: "rgba(10,132,255,0.10)" }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="body" truncate>
          {value}
        </Text>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- states --- */

function InfoSkeleton() {
  return (
    <DiscoverShell active="matches">
      <TopBar title="Chat info" />
      <div className="flex flex-col items-center" style={{ marginTop: spacing[5], gap: spacing[3] }}>
        <Skeleton style={{ width: 96, height: 96, borderRadius: 999 }} />
        <Skeleton style={{ height: 24, width: 160, borderRadius: 10 }} />
      </div>
      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[5] }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 64, borderRadius: 18 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function InfoUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <TopBar title="Chat info" onBack={() => navigate({ to: "/chat" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="search"
          tone="slate"
          title="Conversation unavailable"
          description="This chat can't be found — it may already have been unmatched or blocked."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/chat" })}>
              Back to messages
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
