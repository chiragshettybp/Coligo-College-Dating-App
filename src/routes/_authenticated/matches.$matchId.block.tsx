// ============================================================================
// /matches/:matchId/block — dedicated block confirmation page. Blocking stores
// the relationship, removes the active match, hides the profile from Discovery
// and prevents further messaging or matching. Reuses the shared ConfirmShell.
// ============================================================================
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { blockUser } from "@/lib/discover.functions";
import { matchDetailQuery, matchesQuery, unmatch, type MatchListItem } from "@/lib/matches.functions";
import {
  ConfirmShell,
  ConfirmSkeleton,
  ConfirmUnavailable,
} from "./matches.$matchId.unmatch";

export const Route = createFileRoute("/_authenticated/matches/$matchId/block")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(matchDetailQuery(params.matchId)),
  pendingComponent: () => <ConfirmSkeleton title="Block" />,
  errorComponent: () => <ConfirmUnavailable title="Block" />,
  component: BlockPage,
});

const CONSEQUENCES = [
  "You'll be unmatched immediately.",
  "They won't be able to message you.",
  "They'll be hidden from your Discovery.",
  "You won't be matched again in the future.",
];

function BlockPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: match } = useSuspenseQuery(matchDetailQuery(matchId));
  const block = useServerFn(blockUser);
  const endMatch = useServerFn(unmatch);
  const [busy, setBusy] = useState(false);

  if (!match) return <ConfirmUnavailable title="Block" />;
  const name = match.other.fullName ?? "this person";

  const onConfirm = async () => {
    setBusy(true);
    try {
      await block({ data: { userId: match.other.id } });
      await endMatch({ data: { matchId } });
      qc.setQueryData<MatchListItem[]>(matchesQuery().queryKey, (old) =>
        (old ?? []).filter((m) => m.matchId !== matchId),
      );
      await qc.invalidateQueries({ queryKey: matchesQuery().queryKey });
      toast.success(`Blocked ${name.split(/\s+/)[0]}`);
      navigate({ to: "/matches" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't block. Please try again.");
      setBusy(false);
    }
  };

  return (
    <ConfirmShell
      title="Block"
      matchId={matchId}
      avatar={match.other.photos[0]}
      name={name}
      heading={`Block ${name}?`}
      consequences={CONSEQUENCES}
      confirmLabel="Block"
      onConfirm={onConfirm}
      busy={busy}
    />
  );
}
