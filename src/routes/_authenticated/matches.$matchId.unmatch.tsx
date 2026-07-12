// ============================================================================
// /matches/:matchId/unmatch — dedicated confirmation page (no popup). Explains
// the consequences, requires an explicit confirm, archives the match server-
// side (messages are kept, visibility removed) and returns to the dashboard.
// ============================================================================
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { HeartOff } from "lucide-react";

import { matchDetailQuery, matchesQuery, unmatch, type MatchListItem } from "@/lib/matches.functions";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Avatar, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/matches/$matchId/unmatch")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(matchDetailQuery(params.matchId)),
  pendingComponent: () => <ConfirmSkeleton title="Unmatch" />,
  errorComponent: () => <ConfirmUnavailable title="Unmatch" />,
  component: UnmatchPage,
});

const CONSEQUENCES = [
  "You'll be removed from each other's Matches.",
  "Your conversation will be archived and hidden.",
  "You won't appear to each other in Discovery.",
  "This can't be undone from here.",
];

function UnmatchPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: match } = useSuspenseQuery(matchDetailQuery(matchId));
  const run = useServerFn(unmatch);
  const [busy, setBusy] = useState(false);

  if (!match) return <ConfirmUnavailable title="Unmatch" />;
  const name = match.other.fullName ?? "this person";

  const onConfirm = async () => {
    setBusy(true);
    try {
      const res = await run({ data: { matchId } });
      if (!res.ok) throw new Error("Already unmatched.");
      qc.setQueryData<MatchListItem[]>(matchesQuery().queryKey, (old) =>
        (old ?? []).filter((m) => m.matchId !== matchId),
      );
      await qc.invalidateQueries({ queryKey: matchesQuery().queryKey });
      toast.success(`Unmatched ${name.split(/\s+/)[0]}`);
      navigate({ to: "/matches" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't unmatch. Please try again.");
      setBusy(false);
    }
  };

  return (
    <ConfirmShell
      title="Unmatch"
      matchId={matchId}
      avatar={match.other.photos[0]}
      name={name}
      heading={`Unmatch ${name}?`}
      consequences={CONSEQUENCES}
      confirmLabel="Unmatch"
      onConfirm={onConfirm}
      busy={busy}
    />
  );
}

/* -------------------------------------------------- shared confirm layout -- */

export function ConfirmShell({
  title,
  matchId,
  avatar,
  name,
  heading,
  consequences,
  confirmLabel,
  onConfirm,
  busy,
  children,
}: {
  title: string;
  matchId: string;
  avatar?: string;
  name: string;
  heading: string;
  consequences: string[];
  confirmLabel: string;
  onConfirm: () => void;
  busy: boolean;
  children?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <TopBar
        title={title}
        onBack={() => navigate({ to: "/matches/$matchId", params: { matchId } })}
      />

      <div className="flex flex-col items-center" style={{ marginTop: spacing[6], textAlign: "center" }}>
        <Avatar src={avatar ?? undefined} initials={name.slice(0, 1).toUpperCase()} size="xl" />
        <Text variant="headingLg" style={{ marginTop: spacing[4] }}>
          {heading}
        </Text>
      </div>

      <Card style={{ marginTop: spacing[5] }}>
        <CardBody>
          <div className="flex flex-col" style={{ gap: spacing[2] }}>
            {consequences.map((c) => (
              <div key={c} className="flex items-start" style={{ gap: spacing[2] }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: colors.textMuted,
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

      {children}

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[6] }}>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          onClick={onConfirm}
          leftIcon={<HeartOff style={{ width: 18, height: 18 }} />}
        >
          {confirmLabel}
        </Button>
        <Button
          variant="glass"
          fullWidth
          disabled={busy}
          onClick={() => navigate({ to: "/matches/$matchId", params: { matchId } })}
        >
          Cancel
        </Button>
      </div>
    </DiscoverShell>
  );
}

export function ConfirmSkeleton({ title }: { title: string }) {
  return (
    <DiscoverShell active="matches">
      <TopBar title={title} />
      <div className="flex flex-col items-center" style={{ marginTop: spacing[6] }}>
        <Skeleton style={{ width: 96, height: 96, borderRadius: 999 }} />
        <Skeleton style={{ width: 200, height: 28, borderRadius: 8, marginTop: spacing[4] }} />
      </div>
      <Skeleton style={{ height: 140, borderRadius: 18, marginTop: spacing[5] }} />
    </DiscoverShell>
  );
}

export function ConfirmUnavailable({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <TopBar title={title} onBack={() => navigate({ to: "/matches" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="search"
          tone="slate"
          title="Match unavailable"
          description="This match can't be found — it may already have been unmatched or blocked."
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
