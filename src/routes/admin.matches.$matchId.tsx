// ============================================================================
// /admin/matches/:matchId — Full match management view. Real Supabase data via
// admin-gated server functions: match info, both participants, conversation
// statistics, first note, relationship timeline, health scores, reports, chat
// preview, and in-page (never popup) admin actions with mandatory audit logging.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Heart,
  UserRound,
  MessageSquare,
  Clock,
  Activity,
  Archive,
  RotateCcw,
  Unlink,
  Trash2,
  Flag,
  ShieldAlert,
  MessageSquareOff,
  Download,
  Image as ImageIcon,
  Mic,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  matchDetailQuery,
  matchActionsQuery,
  archiveMatch,
  restoreMatch,
  deleteMatch,
  forceUnmatch,
  setConversation,
  flagMatch,
  markSuspicious,
  type AdminMatchDetail,
} from "@/lib/admin-matches.functions";
import { adminGuardQuery } from "@/lib/admin.functions";
import { Text, Button, Skeleton, Avatar, Badge } from "@/components/ds/glass";
import { Card, EmptyStateCard, CardDivider, StatCard } from "@/components/ds/card";
import { TopBar, SegmentControl } from "@/components/ds/navigation";
import {
  MatchStatusBadge,
  FlagBadge,
  initialsOf,
  timeAgo,
  shortId,
  cap,
  formatDuration,
  prettyAction,
} from "@/components/admin/match-bits";
import { colors, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/admin/matches/$matchId")({
  head: () => ({
    meta: [
      { title: "Match detail — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MatchDetailGuard,
});

function MatchDetailGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);
  if (isLoading) return <DetailSkeleton />;
  if (!allowed) return null;
  return <MatchDetail />;
}

type Tab = "overview" | "conversation" | "timeline" | "actions";
const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "conversation", label: "Conversation" },
  { value: "timeline", label: "Timeline" },
  { value: "actions", label: "Actions" },
];

type PendingAction =
  | { kind: "archive" | "restore" | "delete" | "unmatch"; label: string; danger: boolean }
  | { kind: "conversation"; value: boolean; label: string; danger: boolean }
  | { kind: "flag"; value: boolean; label: string; danger: boolean }
  | { kind: "suspicious"; value: boolean; label: string; danger: boolean }
  | null;

function MatchDetail() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { matchId } = Route.useParams();

  const detail = useQuery(matchDetailQuery(matchId));
  const actions = useQuery(matchActionsQuery(matchId));

  const [tab, setTab] = useState<Tab>("overview");
  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const d = detail.data;

  const run = async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    try {
      haptic("medium");
      if (pending.kind === "archive") await archiveMatch({ data: { matchId, reason: reason || undefined } });
      else if (pending.kind === "restore") await restoreMatch({ data: { matchId, reason: reason || undefined } });
      else if (pending.kind === "delete") await deleteMatch({ data: { matchId, reason: reason || undefined } });
      else if (pending.kind === "unmatch") await forceUnmatch({ data: { matchId, reason: reason || undefined } });
      else if (pending.kind === "conversation") await setConversation({ data: { matchId, value: pending.value, reason: reason || undefined } });
      else if (pending.kind === "flag") await flagMatch({ data: { matchId, value: pending.value, reason: reason || undefined } });
      else if (pending.kind === "suspicious") await markSuspicious({ data: { matchId, value: pending.value, reason: reason || undefined } });
      setPending(null);
      setReason("");
      invalidate();
      if (pending.kind === "delete") navigate({ to: "/admin/matches" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError) {
    return (
      <Wrap onBack={() => navigate({ to: "/admin/matches" })}>
        <EmptyStateCard icon={<Heart style={{ width: 26, height: 26 }} />} title="Couldn't load match" description="Something went wrong. Try again." action={<Button variant="primary" onClick={() => detail.refetch()}>Retry</Button>} />
      </Wrap>
    );
  }
  if (!d) {
    return (
      <Wrap onBack={() => navigate({ to: "/admin/matches" })}>
        <EmptyStateCard icon={<Heart style={{ width: 26, height: 26 }} />} title="Match not found" description="This match may have been permanently deleted." />
      </Wrap>
    );
  }

  return (
    <Wrap onBack={() => navigate({ to: "/admin/matches" })} title={shortId(d.id)}>
      {/* Header summary */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[4] }}>
        <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
          <MatchStatusBadge status={d.status} />
          <FlagBadge flagged={d.flagged} suspicious={d.suspicious} />
          {d.conversationDisabled && <Badge tone="danger">Chat disabled</Badge>}
          <Badge tone="neutral">{cap(d.matchSource ?? "discovery")}</Badge>
          <div style={{ flex: 1 }} />
          <Text variant="caption" tone="muted">Created {timeAgo(d.createdAt)}</Text>
        </div>
        <div className="flex items-center justify-center" style={{ gap: spacing[3], marginTop: spacing[4] }}>
          <ParticipantChip p={d.participantA} onOpen={(id) => navigate({ to: "/admin/users/$userId", params: { userId: id } })} />
          <Heart style={{ width: 22, height: 22, color: colors.primary }} />
          <ParticipantChip p={d.participantB} onOpen={(id) => navigate({ to: "/admin/users/$userId", params: { userId: id } })} />
        </div>
      </Card>

      <div style={{ marginTop: spacing[3] }}>
        <SegmentControl options={TABS.map((t) => t.label)} value={TABS.findIndex((t) => t.value === tab)} onChange={(i) => setTab(TABS[i].value)} />
      </div>

      {err && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3], border: `1px solid ${colors.danger}` }}>
          <Text variant="body" color={colors.danger}>{err}</Text>
        </Card>
      )}

      {tab === "overview" && <OverviewTab d={d} />}
      {tab === "conversation" && <ConversationTab d={d} />}
      {tab === "timeline" && <TimelineTab d={d} actions={actions.data ?? []} />}
      {tab === "actions" && (
        <ActionsTab d={d} pending={pending} reason={reason} busy={busy} onReason={setReason} onPick={setPending} onCancel={() => { setPending(null); setReason(""); }} onConfirm={run} />
      )}
    </Wrap>
  );
}

// -------------------------------------------------------------------- tabs
function OverviewTab({ d }: { d: AdminMatchDetail }) {
  const health = useMemo(() => computeHealth(d), [d]);
  return (
    <>
      {/* Match info */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Match information</Text>
        <div style={{ marginTop: spacing[2], display: "grid", gap: spacing[1] }}>
          <Row label="Match ID" value={d.id} />
          <Row label="Status" value={cap(d.status)} />
          <Row label="Source" value={cap(d.matchSource ?? "discovery")} />
          <Row label="Created" value={new Date(d.createdAt).toLocaleString()} />
          <Row label="First like" value={d.firstLikeAt ? new Date(d.firstLikeAt).toLocaleString() : "—"} />
          <Row label="Mutual like" value={d.mutualLikeAt ? new Date(d.mutualLikeAt).toLocaleString() : "—"} />
          {d.unmatchedAt && <Row label="Unmatched" value={new Date(d.unmatchedAt).toLocaleString()} />}
          {d.archivedAt && <Row label="Archived" value={new Date(d.archivedAt).toLocaleString()} />}
        </div>
      </Card>

      {/* Participants */}
      <div style={{ display: "grid", gap: spacing[2], marginTop: spacing[3], gridTemplateColumns: "1fr" }}>
        <ParticipantCard title="Participant A" p={d.participantA} />
        <ParticipantCard title="Participant B" p={d.participantB} />
      </div>

      {/* Relationship health */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Relationship health</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: spacing[2], marginTop: spacing[3] }}>
          <StatCard label="Activity score" value={`${health.activity}`} />
          <StatCard label="Engagement" value={`${health.engagement}`} />
          <StatCard label="Response score" value={`${health.response}`} />
          <StatCard label="Longevity" value={formatDuration((Date.now() - new Date(d.createdAt).getTime()) / 1000)} />
        </div>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing[2] }}>
          Future AI compatibility metrics plug into this section.
        </Text>
      </Card>

      {/* Reports */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Reports</Text>
        {d.reports.length === 0 ? (
          <Text variant="body" tone="muted" style={{ marginTop: spacing[2] }}>No reports associated with this match.</Text>
        ) : (
          <div style={{ marginTop: spacing[2], display: "grid", gap: spacing[2] }}>
            {d.reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between" style={{ gap: spacing[2] }}>
                <div style={{ minWidth: 0 }}>
                  <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{r.reason ?? "Report"}</Text>
                  <div><Text variant="caption" tone="muted">{shortId(r.id)} · {timeAgo(r.createdAt)}</Text></div>
                </div>
                <Badge tone="neutral">{cap(r.status ?? "open")}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function ConversationTab({ d }: { d: AdminMatchDetail }) {
  const c = d.conversation;
  const startedBy = c?.startedBy === d.participantA?.id ? d.participantA?.name : c?.startedBy === d.participantB?.id ? d.participantB?.name : null;
  const nameFor = (id: string | null) =>
    id === d.participantA?.id ? d.participantA?.name : id === d.participantB?.id ? d.participantB?.name : "Unknown";
  return (
    <>
      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Conversation statistics</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: spacing[2], marginTop: spacing[3] }}>
          <StatCard label="Total messages" value={c?.total ?? 0} />
          <StatCard label="Text messages" value={c?.text ?? 0} />
          <StatCard label="Images shared" value={c?.images ?? 0} />
          <StatCard label="Voice notes" value={c?.voice ?? 0} />
          <StatCard label="Replies" value={c?.replies ?? 0} />
          <StatCard label="Read messages" value={c?.read ?? 0} />
        </div>
        <div style={{ marginTop: spacing[2], display: "grid", gap: spacing[1] }}>
          <Row label="Started by" value={startedBy ?? "—"} />
          <Row label="First message" value={c?.firstAt ? new Date(c.firstAt).toLocaleString() : "—"} />
          <Row label="Last message" value={c?.lastAt ? new Date(c.lastAt).toLocaleString() : "—"} />
        </div>
      </Card>

      {/* First note */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>First note</Text>
        {d.firstNote ? (
          <div style={{ marginTop: spacing[2] }}>
            <Text variant="caption" tone="muted">{nameFor(d.firstNote.sender)} · {new Date(d.firstNote.timestamp).toLocaleString()}</Text>
            <Text variant="body" color={colors.textPrimary} style={{ marginTop: spacing[1] }}>{d.firstNote.content ?? "(media)"}</Text>
          </div>
        ) : (
          <Text variant="body" tone="muted" style={{ marginTop: spacing[2] }}>No First Note Sent</Text>
        )}
      </Card>

      {/* Chat preview */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Chat preview</Text>
        {d.recentMessages.length === 0 ? (
          <Text variant="body" tone="muted" style={{ marginTop: spacing[2] }}>No messages in this conversation.</Text>
        ) : (
          <div style={{ marginTop: spacing[2], display: "grid", gap: spacing[2] }}>
            {[...d.recentMessages].reverse().map((m) => {
              const mine = m.sender_id === d.participantB?.id;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%", background: mine ? colors.primary : surfaces.glassSoft, color: mine ? "#fff" : colors.textPrimary, padding: "8px 12px", borderRadius: 14, fontSize: 13 }}>
                    {m.body ? m.body : m.image_path ? <span className="inline-flex items-center" style={{ gap: 4 }}><ImageIcon style={{ width: 14, height: 14 }} /> Image</span> : m.audio_path ? <span className="inline-flex items-center" style={{ gap: 4 }}><Mic style={{ width: 14, height: 14 }} /> Voice note</span> : "(empty)"}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{nameFor(m.sender_id)} · {timeAgo(m.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}

function TimelineTab({ d, actions }: { d: AdminMatchDetail; actions: { id: string; action: string; reason: string | null; adminName: string | null; createdAt: string }[] }) {
  const events = (
    [
      { at: d.firstLikeAt, label: "First like" },
      { at: d.mutualLikeAt, label: "Match created" },
      { at: d.firstNote?.timestamp ?? null, label: "First note sent" },
      { at: d.conversation?.firstAt ?? null, label: "Conversation started" },
      { at: d.conversation?.lastAt ?? null, label: "Last message" },
      { at: d.unmatchedAt, label: "Unmatched" },
      { at: d.archivedAt, label: "Archived" },
      { at: d.deletedAt, label: "Deleted" },
    ] as { at: string | null; label: string }[]
  ).filter((e): e is { at: string; label: string } => !!e.at);

  return (
    <>
      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Relationship timeline</Text>
        <div style={{ marginTop: spacing[3], display: "grid", gap: spacing[3] }}>
          {events.length === 0 ? (
            <Text variant="body" tone="muted">No timeline events yet.</Text>
          ) : (
            events
              .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
              .map((e, i) => (
                <div key={i} className="flex items-start" style={{ gap: spacing[2] }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: colors.primary, marginTop: 6 }} />
                  <div>
                    <Text variant="body" color={colors.textPrimary}>{e.label}</Text>
                    <Text variant="caption" tone="muted">{new Date(e.at).toLocaleString()}</Text>
                  </div>
                </div>
              ))
          )}
        </div>
      </Card>

      {/* Audit log */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Admin audit log</Text>
        {actions.length === 0 ? (
          <Text variant="body" tone="muted" style={{ marginTop: spacing[2] }}>No admin actions recorded.</Text>
        ) : (
          <div style={{ marginTop: spacing[2], display: "grid", gap: spacing[2] }}>
            {actions.map((a) => (
              <div key={a.id}>
                <Text variant="body" color={colors.textPrimary}>{prettyAction(a.action)}</Text>
                <Text variant="caption" tone="muted">{a.adminName ?? "Admin"} · {timeAgo(a.createdAt)}{a.reason ? ` · ${a.reason}` : ""}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function ActionsTab({ d, pending, reason, busy, onReason, onPick, onCancel, onConfirm }: {
  d: AdminMatchDetail;
  pending: PendingAction;
  reason: string;
  busy: boolean;
  onReason: (v: string) => void;
  onPick: (p: PendingAction) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const btns: { key: string; label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = [
    { key: "archive", label: "Archive match", icon: <Archive style={I} />, onClick: () => onPick({ kind: "archive", label: "Archive match", danger: false }) },
    { key: "restore", label: "Restore match", icon: <RotateCcw style={I} />, onClick: () => onPick({ kind: "restore", label: "Restore match", danger: false }) },
    { key: "unmatch", label: "Force unmatch", icon: <Unlink style={I} />, onClick: () => onPick({ kind: "unmatch", label: "Force unmatch", danger: true }), danger: true },
    { key: "convo", label: d.conversationDisabled ? "Enable conversation" : "Disable conversation", icon: <MessageSquareOff style={I} />, onClick: () => onPick({ kind: "conversation", value: !d.conversationDisabled, label: d.conversationDisabled ? "Enable conversation" : "Disable conversation", danger: !d.conversationDisabled }) },
    { key: "flag", label: d.flagged ? "Remove flag" : "Flag match", icon: <Flag style={I} />, onClick: () => onPick({ kind: "flag", value: !d.flagged, label: d.flagged ? "Remove flag" : "Flag match", danger: false }) },
    { key: "susp", label: d.suspicious ? "Clear suspicious" : "Mark suspicious", icon: <ShieldAlert style={I} />, onClick: () => onPick({ kind: "suspicious", value: !d.suspicious, label: d.suspicious ? "Clear suspicious" : "Mark suspicious", danger: !d.suspicious }) },
    { key: "delete", label: "Delete match", icon: <Trash2 style={I} />, onClick: () => onPick({ kind: "delete", label: "Delete match", danger: true }), danger: true },
  ];

  return (
    <>
      {pending && (
        <Card padding={spacing[4]} style={{ marginTop: spacing[3], border: `1px solid ${pending.danger ? colors.danger : surfaces.border}` }}>
          <Text variant="headingSm" color={colors.textPrimary}>{pending.label}</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
            This action is logged to the immutable audit trail. Add an optional reason.
          </Text>
          <textarea
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={3}
            style={{ width: "100%", marginTop: spacing[3], background: surfaces.glassSoft, color: colors.textPrimary, border: `1px solid ${surfaces.border}`, borderRadius: 10, padding: 12, fontSize: 13, resize: "vertical" }}
          />
          <div className="flex" style={{ gap: spacing[2], marginTop: spacing[3] }}>
            <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
            <div style={{ flex: 1 }} />
            <Button variant={pending.danger ? "danger" : "primary"} loading={busy} onClick={onConfirm}>Confirm</Button>
          </div>
        </Card>
      )}

      <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Admin actions</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing[1] }}>Every action requires confirmation and is recorded in the audit log.</Text>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: spacing[2], marginTop: spacing[3] }}>
          {btns.map((b) => (
            <Button key={b.key} variant={b.danger ? "danger" : "secondary"} leftIcon={b.icon} onClick={b.onClick} disabled={busy}>{b.label}</Button>
          ))}
        </div>
      </Card>
    </>
  );
}

// -------------------------------------------------------------- small parts
const I: React.CSSProperties = { width: 16, height: 16 };

function ParticipantChip({ p, onOpen }: { p: AdminMatchDetail["participantA"]; onOpen: (id: string) => void }) {
  if (!p) return <div style={{ textAlign: "center" }}><Avatar size="lg" initials="?" /><Text variant="caption" tone="muted" style={{ marginTop: spacing[1] }}>Deleted user</Text></div>;
  return (
    <button onClick={() => onOpen(p.id)} style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "center" }}>
      <Avatar src={p.avatar ?? undefined} size="lg" initials={initialsOf(p.name)} />
      <div style={{ marginTop: spacing[1] }}><Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{p.name ?? "—"}</Text></div>
      <Text variant="caption" tone="muted">{p.college ?? "—"}</Text>
    </button>
  );
}

function ParticipantCard({ title, p }: { title: string; p: AdminMatchDetail["participantA"] }) {
  const navigate = useNavigate();
  if (!p) {
    return (
      <Card padding={spacing[4]}>
        <Text variant="caption" tone="muted">{title}</Text>
        <Text variant="body" color={colors.textPrimary} style={{ marginTop: spacing[1] }}>Deleted user</Text>
      </Card>
    );
  }
  return (
    <Card padding={spacing[4]}>
      <Text variant="caption" tone="muted">{title}</Text>
      <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[2] }}>
        <Avatar src={p.avatar ?? undefined} size="md" initials={initialsOf(p.name)} />
        <div style={{ minWidth: 0 }}>
          <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{p.name ?? "—"}</Text>
          <Text variant="caption" tone="muted">{p.phone ?? "—"}</Text>
        </div>
      </div>
      <div style={{ marginTop: spacing[2], display: "grid", gap: spacing[1] }}>
        <Row label="College" value={p.college ?? "—"} />
        <Row label="Department" value={p.department ?? "—"} />
        <Row label="Semester" value={p.semester != null ? String(p.semester) : "—"} />
        <Row label="Graduation" value={p.graduationYear != null ? String(p.graduationYear) : "—"} />
        <Row label="Account" value={cap(p.accountStatus ?? "—")} />
        <Row label="Verification" value={cap(p.verificationStatus ?? "—")} />
      </div>
      <div style={{ marginTop: spacing[3] }}>
        <Button variant="secondary" size="sm" leftIcon={<ExternalLink style={{ width: 14, height: 14 }} />} onClick={() => navigate({ to: "/admin/users/$userId", params: { userId: p.id } })}>Open user profile</Button>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: spacing[3] }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="caption" color={colors.textPrimary} style={{ textAlign: "right", wordBreak: "break-word" }}>{value}</Text>
    </div>
  );
}

function computeHealth(d: AdminMatchDetail) {
  const c = d.conversation;
  const total = c?.total ?? 0;
  const activity = Math.min(100, total * 5);
  const engagement = total > 0 ? Math.min(100, Math.round(((c?.replies ?? 0) / total) * 100) + 20) : 0;
  const response = total > 0 ? Math.min(100, Math.round(((c?.read ?? 0) / total) * 100)) : 0;
  return { activity, engagement, response };
}

function Wrap({ children, onBack, title }: { children: React.ReactNode; onBack: () => void; title?: string }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar title={title ?? "Match detail"} onBack={onBack} />
      {children}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4] }}>
      <Skeleton style={{ height: 40, borderRadius: 12, marginBottom: spacing[4] }} />
      <Skeleton style={{ height: 120, borderRadius: 16, marginBottom: spacing[3] }} />
      <Skeleton style={{ height: 44, borderRadius: 12, marginBottom: spacing[3] }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} style={{ height: 100, borderRadius: 16, marginBottom: spacing[2] }} />
      ))}
    </div>
  );
}
