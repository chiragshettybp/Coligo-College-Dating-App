// ============================================================================
// /matches/:matchId/report — dedicated report page. Choose a reason, add an
// optional description, and submit to Supabase (reports table). Duplicate
// reports are prevented by the reporter/reported unique pairing server-side.
// ============================================================================
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flag } from "lucide-react";

import { reportUser } from "@/lib/discover.functions";
import { matchDetailQuery } from "@/lib/matches.functions";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Avatar, Chip, Skeleton } from "@/components/ds/glass";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/matches/$matchId/report")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(matchDetailQuery(params.matchId)),
  pendingComponent: ReportSkeleton,
  errorComponent: ReportUnavailable,
  component: ReportPage,
});

const REASONS = [
  "Inappropriate photos",
  "Harassment or bullying",
  "Fake or spam account",
  "Offensive messages",
  "Underage",
  "Something else",
];

const DETAILS_MAX = 500;

function ReportPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: match } = useSuspenseQuery(matchDetailQuery(matchId));
  const report = useServerFn(reportUser);

  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  if (!match) return <ReportUnavailable />;
  const name = match.other.fullName ?? "this person";
  const tooLong = details.length > DETAILS_MAX;
  const canSubmit = !!reason && !tooLong && !busy;

  const onSubmit = async () => {
    if (!canSubmit || !reason) return;
    setBusy(true);
    try {
      await report({
        data: { userId: match.other.id, reason, details: details.trim() || undefined },
      });
      await qc.invalidateQueries({ queryKey: matchDetailQuery(matchId).queryKey });
      toast.success("Report submitted. Our team will review it.");
      navigate({ to: "/matches/$matchId", params: { matchId } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't submit report.";
      toast.error(msg.includes("duplicate") ? "You've already reported this person." : msg);
      setBusy(false);
    }
  };

  return (
    <DiscoverShell active="matches">
      <TopBar
        title="Report"
        onBack={() => navigate({ to: "/matches/$matchId", params: { matchId } })}
      />

      <div className="flex items-center" style={{ gap: spacing[3], marginTop: spacing[4] }}>
        <Avatar
          src={match.other.photos[0] ?? undefined}
          initials={name.slice(0, 1).toUpperCase()}
          size="md"
        />
        <div style={{ minWidth: 0 }}>
          <Text variant="headingSm" truncate>
            Report {name}
          </Text>
          <Text variant="caption" tone="muted">
            Reports are confidential.
          </Text>
        </div>
      </div>

      <Text variant="headingSm" style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
        Why are you reporting?
      </Text>
      <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
        {REASONS.map((r) => (
          <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
            {r}
          </Chip>
        ))}
      </div>

      <Text variant="headingSm" style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
        Add details (optional)
      </Text>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Share anything that helps our team understand what happened."
        rows={4}
        aria-label="Report details"
        maxLength={DETAILS_MAX + 40}
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
      <div className="flex" style={{ justifyContent: "flex-end", marginTop: spacing[1] }}>
        <Text variant="caption" color={tooLong ? colors.danger : colors.textMuted} numeric>
          {details.length}/{DETAILS_MAX}
        </Text>
      </div>

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[5] }}>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          disabled={!canSubmit}
          onClick={onSubmit}
          leftIcon={<Flag style={{ width: 18, height: 18 }} />}
        >
          Submit report
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

/* --------------------------------------------------------------- states --- */

function ReportSkeleton() {
  return (
    <DiscoverShell active="matches">
      <TopBar title="Report" />
      <Skeleton style={{ height: 60, borderRadius: 16, marginTop: spacing[4] }} />
      <Skeleton style={{ height: 120, borderRadius: 16, marginTop: spacing[5] }} />
    </DiscoverShell>
  );
}

function ReportUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <TopBar title="Report" onBack={() => navigate({ to: "/matches" })} />
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
