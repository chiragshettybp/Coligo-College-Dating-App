// ============================================================================
// /matches/:matchId/note — send an optional first note right after matching.
// Multiline input, live char counter + max limit, validation and duplicate
// prevention (a note already sent renders read-only). On send the note becomes
// the first real message and the user lands in the conversation view.
// ============================================================================
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, CheckCircle2 } from "lucide-react";

import {
  matchDetailQuery,
  noteStatusQuery,
  matchesQuery,
  sendFirstNote,
  NOTE_MAX,
} from "@/lib/matches.functions";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Avatar, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/matches/$matchId/note")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(matchDetailQuery(params.matchId)),
      context.queryClient.ensureQueryData(noteStatusQuery(params.matchId)),
    ]),
  pendingComponent: NoteSkeleton,
  errorComponent: NoteUnavailable,
  component: NotePage,
});

function starter(name: string | null, shared: string[]): string {
  const who = name?.split(/\s+/)[0] ?? "there";
  if (shared.length > 0)
    return `Hey ${who}! We both love ${shared[0].toLowerCase()} — how did you get into it?`;
  return `Hey ${who}! What's been the highlight of your semester so far?`;
}

function NotePage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: match } = useSuspenseQuery(matchDetailQuery(matchId));
  const { data: note } = useSuspenseQuery(noteStatusQuery(matchId));
  const send = useServerFn(sendFirstNote);

  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (!match) return <NoteUnavailable />;

  const { other } = match;
  const name = other.fullName ?? "your match";
  const alreadySent = note.noteSent || match.noteSent;
  const trimmed = body.trim();
  const tooLong = body.length > NOTE_MAX;
  const canSend = trimmed.length > 0 && !tooLong && !busy;

  const onSend = async () => {
    if (!canSend) return;
    setBusy(true);
    try {
      await send({ data: { matchId, body: trimmed } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: noteStatusQuery(matchId).queryKey }),
        qc.invalidateQueries({ queryKey: matchDetailQuery(matchId).queryKey }),
        qc.invalidateQueries({ queryKey: matchesQuery().queryKey }),
      ]);
      toast.success(`Sent to ${name.split(/\s+/)[0]} 💬`);
      navigate({ to: "/matches/$matchId", params: { matchId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send. Please try again.");
      setBusy(false);
    }
  };

  return (
    <DiscoverShell active="matches">
      <TopBar
        title="Send a note"
        onBack={() => navigate({ to: "/matches/$matchId", params: { matchId } })}
      />

      <Card style={{ marginTop: spacing[4] }}>
        <CardBody>
          <div className="flex items-center" style={{ gap: spacing[3] }}>
            <Avatar
              src={other.photos[0] ?? undefined}
              initials={name.slice(0, 1).toUpperCase()}
              size="md"
              verified
            />
            <div style={{ minWidth: 0 }}>
              <Text variant="headingSm" truncate>
                {name}
              </Text>
              <Text variant="caption" tone="muted">
                {alreadySent ? "Conversation started" : "Break the ice"}
              </Text>
            </div>
          </div>
        </CardBody>
      </Card>

      {alreadySent ? (
        <div style={{ marginTop: spacing[5] }}>
          <div
            className="flex items-center"
            style={{ gap: 8, color: colors.success, fontWeight: 600, marginBottom: spacing[2] }}
          >
            <CheckCircle2 style={{ width: 18, height: 18 }} />
            <Text variant="bodySm" color={colors.success}>
              You've already sent your first note.
            </Text>
          </div>
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate({ to: "/matches/$matchId", params: { matchId } })}
          >
            Back to match
          </Button>
        </div>
      ) : (
        <>
          <div style={{ marginTop: spacing[5] }}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={starter(other.fullName, other.mutualInterests)}
              rows={5}
              aria-label="Your first note"
              maxLength={NOTE_MAX + 40}
              style={{
                width: "100%",
                resize: "none",
                padding: spacing[3],
                borderRadius: radii.lg,
                background: surfaces.glass,
                border: `1px solid ${tooLong ? colors.danger : surfaces.border}`,
                color: colors.textPrimary,
                fontSize: 15,
                lineHeight: 1.5,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div
              className="flex items-center"
              style={{ justifyContent: "space-between", marginTop: spacing[1] }}
            >
              <Text variant="caption" tone="muted">
                A friendly, specific opener gets more replies.
              </Text>
              <Text
                variant="caption"
                color={tooLong ? colors.danger : colors.textMuted}
                numeric
              >
                {body.length}/{NOTE_MAX}
              </Text>
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            loading={busy}
            disabled={!canSend}
            onClick={onSend}
            leftIcon={<Send style={{ width: 18, height: 18 }} />}
            style={{ marginTop: spacing[4] }}
          >
            Send note
          </Button>
        </>
      )}
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function NoteSkeleton() {
  return (
    <DiscoverShell active="matches">
      <TopBar title="Send a note" />
      <Skeleton style={{ height: 76, borderRadius: 18, marginTop: spacing[4] }} />
      <Skeleton style={{ height: 140, borderRadius: 18, marginTop: spacing[5] }} />
      <Skeleton style={{ height: 48, borderRadius: 14, marginTop: spacing[4] }} />
    </DiscoverShell>
  );
}

function NoteUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <TopBar title="Send a note" onBack={() => navigate({ to: "/matches" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="messages"
          tone="slate"
          title="Can't send a note"
          description="This match isn't available anymore — it may have been unmatched, blocked, or the account was removed."
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
