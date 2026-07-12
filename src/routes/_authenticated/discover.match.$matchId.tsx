// ============================================================================
// /discover/match/:matchId — the "It's a match" celebration. Loads both people
// via the match_screen RPC (participants only) and hands off to the shared
// MatchCelebration design component. Sending the first note persists a real
// message row for the future Chat module; "Keep swiping" returns to the feed.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { matchQuery, sendMatchNote } from "@/lib/discover.functions";
import { APP_BACKGROUND, colors, spacing } from "@/lib/ds";
import { Button, Text } from "@/components/ds/glass";
import { MatchCelebration } from "@/components/ds/match-celebration";
import sampleAvatar from "@/assets/sample.png";

export const Route = createFileRoute("/_authenticated/discover/match/$matchId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(matchQuery(params.matchId)),
  pendingComponent: MatchLoading,
  errorComponent: MatchUnavailable,
  component: MatchPage,
});

function starter(shared: string[], name: string | null): string {
  const who = name?.split(/\s+/)[0] ?? "them";
  if (shared.length > 0) return `We both love ${shared[0].toLowerCase()} — what got you into it, ${who}?`;
  return `Hey ${who}! What's been the highlight of your semester so far?`;
}

function MatchPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const { data: match } = useSuspenseQuery(matchQuery(matchId));
  const sendNote = useServerFn(sendMatchNote);

  if (!match) return <MatchUnavailable />;

  const semester = match.other.semester ? `Semester ${match.other.semester}` : "";

  return (
    <div style={{ minHeight: "100vh", background: APP_BACKGROUND }}>
      <MatchCelebration
        open
        left={{ src: match.me.avatarUrl ?? sampleAvatar, name: match.me.name ?? "You" }}
        right={{ src: match.other.avatarUrl ?? sampleAvatar, name: match.other.name ?? "Them" }}
        shared={{
          college: match.other.collegeName ?? "Your campus",
          semester,
          interests: match.sharedInterests,
          compatibility: match.compatibility,
          conversationStarter: starter(match.sharedInterests, match.other.name),
        }}
        onClose={() => navigate({ to: "/discover" })}
        onOpenChat={async (message) => {
          try {
            await sendNote({ data: { matchId, body: message } });
            toast.success(`Sent to ${match.other.name?.split(/\s+/)[0] ?? "them"} 💬`);
          } catch {
            toast.error("Couldn't send your message.");
          }
          navigate({ to: "/discover" });
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- states --- */

function MatchLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text variant="body" tone="muted">
        Setting up your match…
      </Text>
    </div>
  );
}

function MatchUnavailable() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[4],
        padding: spacing[5],
        textAlign: "center",
      }}
    >
      <Text variant="headingMd" style={{ color: colors.textPrimary }}>
        Match not found
      </Text>
      <Text variant="bodySm" tone="muted">
        This match isn't available. It may have been removed.
      </Text>
      <Button variant="primary" onClick={() => navigate({ to: "/discover" })}>
        Back to discovery
      </Button>
    </div>
  );
}
