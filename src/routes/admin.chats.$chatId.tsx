// ============================================================================
// /admin/chats/:chatId — read-only conversation moderation viewer. Renders the
// entire chat history using the exact /chat DS components (Bubble, ImageMessage,
// VoiceMessage, ReactionsRow, DayDivider, ImageViewer) in read-only mode — no
// composer, no reaction/send handlers. Adds participant panel, timeline, related
// reports, in-page moderation actions (never popups), private moderator notes,
// audit trail, and CSV/TXT export. Real Supabase data via admin-gated fns.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Lock,
  Unlock,
  Archive,
  RotateCcw,
  Flag,
  ShieldAlert,
  Trash2,
  Download,
  StickyNote,
  ExternalLink,
  User as UserIcon,
  Heart,
  FileWarning,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  chatDetailQuery,
  chatNotesQuery,
  chatActionsQuery,
  getChatMessages,
  lockChat,
  archiveChat,
  flagChat,
  escalateChat,
  deleteChat,
  addChatNote,
  type AdminChatDetail,
  type AdminChatMessage,
  type ChatParticipant,
} from "@/lib/admin-chats.functions";
import { adminGuardQuery } from "@/lib/admin.functions";
import { useAdminChatsRealtime } from "@/lib/use-admin-chats-realtime";
import { Text, Badge, Skeleton, Avatar, Button } from "@/components/ds/glass";
import { Card, StatCard, EmptyStateCard } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import {
  Bubble,
  DayDivider,
  ReactionsRow,
  ImageMessage,
  type GroupPos,
  type ReactionGroup,
} from "@/components/ds/chat";
import { VoiceMessage } from "@/components/ds/voice-message";
import { ImageViewer } from "@/components/ds/image-viewer";
import {
  ChatStatusBadge,
  ModerationBadge,
  initialsOf,
  formatDateTime,
  timelineLabel,
  prettyAction,
} from "@/components/admin/chat-bits";
import { colors, spacing, surfaces, radii } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/admin/chats/$chatId")({
  head: () => ({
    meta: [
      { title: "Conversation — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DetailGuard,
});

function DetailGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError, refetch } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);

  if (isLoading) return <DetailSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 420, padding: spacing[6] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Couldn't reach the server</Text>
        <div style={{ marginTop: spacing[4] }}>
          <Button variant="primary" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }
  if (!allowed) return null;
  return <ChatDetail />;
}

type Tab = "conversation" | "participants" | "timeline" | "reports" | "actions" | "notes" | "audit";
const TABS: { key: Tab; label: string }[] = [
  { key: "conversation", label: "Conversation" },
  { key: "participants", label: "Participants" },
  { key: "timeline", label: "Timeline" },
  { key: "reports", label: "Reports" },
  { key: "actions", label: "Moderation" },
  { key: "notes", label: "Notes" },
  { key: "audit", label: "Audit log" },
];

function ChatDetail() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useAdminChatsRealtime(true);

  const [tab, setTab] = useState<Tab>("conversation");
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  const detailQ = useQuery(chatDetailQuery(chatId));
  const detail = detailQ.data;

  if (detailQ.isLoading) return <DetailSkeleton />;
  if (detailQ.isError || !detail) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4] }}>
        <TopBar title="Conversation" onBack={() => navigate({ to: "/admin/chats" })} />
        <EmptyStateCard
          icon={<FileWarning style={{ width: 26, height: 26 }} />}
          title="Conversation not found"
          description="This chat may have been permanently deleted or the ID is invalid."
          action={<Button variant="primary" onClick={() => navigate({ to: "/admin/chats" })}>Back to chats</Button>}
        />
      </div>
    );
  }

  const nameA = detail.participantA?.name ?? "User A";
  const nameB = detail.participantB?.name ?? "User B";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar title="Conversation" onBack={() => navigate({ to: "/admin/chats" })} />

      {/* Header summary */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[4] }}>
        <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
          <div className="flex items-center" style={{ marginRight: 4 }}>
            <Avatar src={detail.participantA?.avatar ?? undefined} size="sm" initials={initialsOf(nameA)} />
            <div style={{ marginLeft: -8 }}>
              <Avatar src={detail.participantB?.avatar ?? undefined} size="sm" initials={initialsOf(nameB)} />
            </div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text variant="headingSm" color={colors.textPrimary}>{nameA} × {nameB}</Text>
            <Text variant="caption" tone="muted">#{chatId.slice(0, 8)} · created {formatDateTime(detail.createdAt)}</Text>
          </div>
          <ChatStatusBadge status={detail.status} locked={detail.conversationDisabled} />
          <ModerationBadge flagged={detail.flagged} investigationStatus={detail.investigationStatus} />
        </div>
        {detail.conversation && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: spacing[2], marginTop: spacing[3] }}>
            <StatCard label="Messages" value={String(detail.conversation.total)} />
            <StatCard label="Images" value={String(detail.conversation.images)} />
            <StatCard label="Voice" value={String(detail.conversation.voice)} />
            <StatCard label="Replies" value={String(detail.conversation.replies)} />
            <StatCard label="Reactions" value={String(detail.conversation.reactions)} />
            <StatCard label="Read" value={String(detail.conversation.read)} />
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex" style={{ gap: spacing[1], marginTop: spacing[3], overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map((t) => {
          const count = t.key === "reports" ? detail.reports.length : undefined;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${tab === t.key ? colors.primary : surfaces.border}`,
                background: tab === t.key ? "rgba(10,132,255,0.10)" : surfaces.glassSoft,
                color: tab === t.key ? colors.primary : colors.textSecondary,
              }}
            >
              {t.label}{count ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: spacing[3] }}>
        {tab === "conversation" && <ConversationTab chatId={chatId} detail={detail} onOpenImage={setViewerSrc} />}
        {tab === "participants" && <ParticipantsTab detail={detail} onOpenUser={(id) => navigate({ to: "/admin/users/$userId", params: { userId: id } })} onOpenMatch={() => navigate({ to: "/admin/matches/$matchId", params: { matchId: chatId } })} onOpenReports={() => navigate({ to: "/admin/reports" })} />}
        {tab === "timeline" && <TimelineTab detail={detail} />}
        {tab === "reports" && <ReportsTab detail={detail} onOpenReports={() => navigate({ to: "/admin/reports" })} onOpenUser={(id) => navigate({ to: "/admin/users/$userId", params: { userId: id } })} />}
        {tab === "actions" && <ActionsTab chatId={chatId} detail={detail} onDeleted={() => navigate({ to: "/admin/chats" })} onChanged={() => qc.invalidateQueries({ queryKey: ["admin"] })} />}
        {tab === "notes" && <NotesTab chatId={chatId} />}
        {tab === "audit" && <AuditTab chatId={chatId} />}
      </div>

      {viewerSrc && <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </div>
  );
}

// ------------------------------------------------------- conversation viewer
function groupReactions(reactions: Record<string, string[]> | undefined): ReactionGroup[] {
  if (!reactions) return [];
  return Object.entries(reactions)
    .filter(([, users]) => Array.isArray(users) && users.length > 0)
    .map(([emoji, users]) => ({ emoji, count: users.length, mine: false }));
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ConversationTab({
  chatId,
  detail,
  onOpenImage,
}: {
  chatId: string;
  detail: AdminChatDetail;
  onOpenImage: (src: string) => void;
}) {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(false);

  // "mine" side = participant B, so A renders left and B renders right.
  const bId = detail.participantB?.id ?? null;
  const nameFor = (id: string | null) =>
    id && id === detail.participantA?.id ? detail.participantA?.name ?? "User A"
      : id && id === detail.participantB?.id ? detail.participantB?.name ?? "User B"
      : "Unknown";

  const loadInitial = async () => {
    setLoading(true);
    setError(false);
    try {
      const page = await getChatMessages({ data: { chatId, limit: 40 } });
      setMessages(page.messages);
      setHasMore(page.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadOlder = async () => {
    if (messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const page = await getChatMessages({ data: { chatId, before: messages[0].created_at, limit: 40 } });
      setMessages((prev) => [...page.messages, ...prev]);
      setHasMore(page.hasMore);
    } catch {
      /* ignore */
    } finally {
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: spacing[2] }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 44, borderRadius: 16, width: i % 2 ? "55%" : "70%", marginLeft: i % 2 ? "auto" : 0 }} />
        ))}
      </div>
    );
  }
  if (error) {
    return <EmptyStateCard icon={<FileWarning style={{ width: 26, height: 26 }} />} title="Failed to load messages" description="Try again." action={<Button variant="primary" onClick={loadInitial}>Retry</Button>} />;
  }
  if (messages.length === 0) {
    return <EmptyStateCard icon={<FileWarning style={{ width: 26, height: 26 }} />} title="No messages" description="This match never exchanged any messages." />;
  }

  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "6px 14px",
          borderBottom: `1px solid ${surfaces.borderSoft}`,
          background: surfaces.glassSoft,
        }}
      >
        <Text variant="caption" tone="muted">Read-only moderation view · {nameFor(detail.participantA?.id ?? null)} (left) · {nameFor(detail.participantB?.id ?? null)} (right)</Text>
      </div>
      <div style={{ padding: `${spacing[3]}px ${spacing[4]}px`, maxHeight: 620, overflowY: "auto" }}>
        {hasMore && (
          <div style={{ textAlign: "center", marginBottom: spacing[2] }}>
            <Button variant="secondary" size="sm" loading={loadingOlder} onClick={loadOlder}>Load earlier messages</Button>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const mine = m.sender_id === bId;
          const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
          const samePrev = prev && prev.sender_id === m.sender_id && !showDay;
          const sameNext = next && next.sender_id === m.sender_id && dayLabel(next.created_at) === dayLabel(m.created_at);
          let pos: GroupPos = "single";
          if (samePrev && sameNext) pos = "middle";
          else if (samePrev) pos = "last";
          else if (sameNext) pos = "first";
          const tail = pos === "single" || pos === "last";
          const showName = pos === "single" || pos === "first";

          const state = mine ? (m.read_at ? "read" : m.delivered_at ? "delivered" : "sent") : undefined;
          const reactionGroups = groupReactions(m.reactions);
          const reply = m.reply
            ? {
                author: nameFor(m.reply.senderId),
                text: m.reply.kind === "image" ? "📷 Photo" : m.reply.kind === "voice" ? "🎤 Voice message" : (m.reply.body ?? ""),
              }
            : null;

          return (
            <div key={m.id}>
              {showDay && <DayDivider label={dayLabel(m.created_at)} />}
              {showName && (
                <div style={{ textAlign: mine ? "right" : "left", padding: mine ? "6px 6px 0 0" : "6px 0 0 6px" }}>
                  <Text variant="caption" tone="muted" style={{ fontWeight: 600 }}>
                    {nameFor(m.sender_id)}{m.flagged ? " · ⚑ flagged" : ""}
                  </Text>
                </div>
              )}
              {m.kind === "voice" && m.audio_url ? (
                <>
                  <VoiceMessage id={m.id} mine={mine} src={m.audio_url} durationMs={m.audio_duration_ms} time={tail ? timeLabel(m.created_at) : undefined} state={state} />
                  <ReactionsRow reactions={reactionGroups} mine={mine} />
                </>
              ) : m.kind === "image" && m.image_url ? (
                <>
                  <ImageMessage mine={mine} src={m.image_url} time={tail ? timeLabel(m.created_at) : undefined} state={state} onOpen={() => onOpenImage(m.image_url!)} />
                  <ReactionsRow reactions={reactionGroups} mine={mine} />
                </>
              ) : (
                <Bubble mine={mine} groupPos={pos} tail={tail} time={tail ? timeLabel(m.created_at) : undefined} state={state} reply={reply} reactions={reactionGroups}>
                  {m.body}
                </Bubble>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// -------------------------------------------------------------- participants
function ParticipantCard({ p, label, onOpenUser }: { p: ChatParticipant | null; label: string; onOpenUser: (id: string) => void }) {
  if (!p) {
    return (
      <Card padding={spacing[4]}>
        <Text variant="caption" tone="muted">{label}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>User no longer exists.</Text>
      </Card>
    );
  }
  return (
    <Card padding={spacing[4]}>
      <div className="flex items-center" style={{ gap: spacing[3] }}>
        <Avatar src={p.avatar ?? undefined} size="md" initials={initialsOf(p.name)} />
        <div style={{ minWidth: 0 }}>
          <Text variant="caption" tone="muted">{label}</Text>
          <Text variant="titleMd" color={colors.textPrimary}>{p.name ?? "—"}</Text>
          <Text variant="caption" tone="muted">{p.phone ?? "no phone"}</Text>
        </div>
      </div>
      <div style={{ display: "grid", gap: spacing[1], marginTop: spacing[3] }}>
        <Row label="College" value={p.college} />
        <Row label="Department" value={p.department} />
        <Row label="Semester" value={p.semester != null ? String(p.semester) : null} />
        <Row label="Grad year" value={p.graduationYear != null ? String(p.graduationYear) : null} />
        <Row label="Account" value={p.accountStatus} />
        <Row label="Verification" value={p.verificationStatus} />
      </div>
      <div style={{ marginTop: spacing[3] }}>
        <Button variant="secondary" size="sm" onClick={() => onOpenUser(p.id)}>
          <UserIcon style={{ width: 14, height: 14, marginRight: 6 }} /> Open profile
        </Button>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{value ?? "—"}</Text>
    </div>
  );
}

function ParticipantsTab({ detail, onOpenUser, onOpenMatch, onOpenReports }: { detail: AdminChatDetail; onOpenUser: (id: string) => void; onOpenMatch: () => void; onOpenReports: () => void }) {
  return (
    <div style={{ display: "grid", gap: spacing[2] }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: spacing[2] }}>
        <ParticipantCard p={detail.participantA} label="Participant A" onOpenUser={onOpenUser} />
        <ParticipantCard p={detail.participantB} label="Participant B" onOpenUser={onOpenUser} />
      </div>
      <Card padding={spacing[3]}>
        <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
          <Button variant="secondary" size="sm" onClick={onOpenMatch}><Heart style={{ width: 14, height: 14, marginRight: 6 }} /> Open match</Button>
          <Button variant="secondary" size="sm" onClick={onOpenReports}><FileWarning style={{ width: 14, height: 14, marginRight: 6 }} /> Open reports</Button>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ timeline
function TimelineTab({ detail }: { detail: AdminChatDetail }) {
  if (!detail.timeline.length) {
    return <EmptyStateCard icon={<FileWarning style={{ width: 26, height: 26 }} />} title="No timeline events" description="Nothing has happened in this conversation yet." />;
  }
  return (
    <Card padding={spacing[4]}>
      <div style={{ display: "grid", gap: spacing[3] }}>
        {detail.timeline.map((ev, i) => (
          <div key={i} className="flex items-start" style={{ gap: spacing[3] }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: colors.primary, marginTop: 5, flexShrink: 0 }} />
            <div>
              <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{timelineLabel(ev.type)}</Text>
              <div><Text variant="caption" tone="muted">{formatDateTime(ev.at)}</Text></div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------- reports
function ReportsTab({ detail, onOpenReports, onOpenUser }: { detail: AdminChatDetail; onOpenReports: () => void; onOpenUser: (id: string) => void }) {
  if (!detail.reports.length) {
    return <EmptyStateCard icon={<FileWarning style={{ width: 26, height: 26 }} />} title="No reports" description="No abuse reports involve these participants." />;
  }
  return (
    <div style={{ display: "grid", gap: spacing[2] }}>
      {detail.reports.map((r) => (
        <Card key={r.id} padding={spacing[3]}>
          <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
            <div style={{ minWidth: 0 }}>
              <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{r.reason ?? "Report"}</Text>
              <div><Text variant="caption" tone="muted">{formatDateTime(r.createdAt)}</Text></div>
            </div>
            <Badge tone={r.status === "resolved" ? "success" : r.status === "pending" ? "warning" : "neutral"}>{r.status ?? "—"}</Badge>
          </div>
          <div className="flex flex-wrap" style={{ gap: spacing[2], marginTop: spacing[2] }}>
            {r.reportedId && <Button variant="secondary" size="sm" onClick={() => onOpenUser(r.reportedId!)}>Reported user</Button>}
            <Button variant="secondary" size="sm" onClick={onOpenReports}><ExternalLink style={{ width: 14, height: 14, marginRight: 6 }} /> Open in reports</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- moderation
type ActionKind = "lock" | "unlock" | "archive" | "restore" | "flag" | "unflag" | "escalate" | "resolve" | "delete" | null;

const ACTION_COPY: Record<string, { title: string; desc: string; danger: boolean; confirm: string }> = {
  lock: { title: "Lock conversation", desc: "Participants can no longer send messages.", danger: true, confirm: "Lock" },
  unlock: { title: "Unlock conversation", desc: "Re-enable messaging for both participants.", danger: false, confirm: "Unlock" },
  archive: { title: "Archive conversation", desc: "Hide from the active queue. Data is preserved.", danger: false, confirm: "Archive" },
  restore: { title: "Restore conversation", desc: "Return this conversation to the active queue.", danger: false, confirm: "Restore" },
  flag: { title: "Flag conversation", desc: "Mark this conversation for moderation review.", danger: false, confirm: "Flag" },
  unflag: { title: "Remove flag", desc: "Clear the moderation flag on this conversation.", danger: false, confirm: "Unflag" },
  escalate: { title: "Escalate to investigation", desc: "Mark this conversation as under review.", danger: true, confirm: "Escalate" },
  resolve: { title: "Resolve investigation", desc: "Close the investigation on this conversation.", danger: false, confirm: "Resolve" },
  delete: { title: "Delete conversation", desc: "Soft-delete per platform policy. Locks messaging and removes it from queues. This is logged and reversible only by restore.", danger: true, confirm: "Delete" },
};

function ActionsTab({ chatId, detail, onDeleted, onChanged }: { chatId: string; detail: AdminChatDetail; onDeleted: () => void; onChanged: () => void }) {
  const [pending, setPending] = useState<ActionKind>(null);
  const [reason, setReason] = useState("");
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    if (!pending) return;
    setRunning(true);
    setErr(null);
    try {
      haptic("medium");
      if (pending === "lock") await lockChat({ data: { chatId, value: true, reason } });
      else if (pending === "unlock") await lockChat({ data: { chatId, value: false, reason } });
      else if (pending === "archive") await archiveChat({ data: { chatId, value: false, reason } });
      else if (pending === "restore") await archiveChat({ data: { chatId, value: true, reason } });
      else if (pending === "flag") await flagChat({ data: { chatId, value: true, reason } });
      else if (pending === "unflag") await flagChat({ data: { chatId, value: false, reason } });
      else if (pending === "escalate") await escalateChat({ data: { chatId, status: "investigating", reason } });
      else if (pending === "resolve") await escalateChat({ data: { chatId, status: "resolved", reason } });
      else if (pending === "delete") {
        await deleteChat({ data: { chatId, reason } });
        onChanged();
        onDeleted();
        return;
      }
      setPending(null);
      setReason("");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setRunning(false);
    }
  };

  const locked = detail.conversationDisabled;
  const archived = detail.status === "archived";
  const flagged = detail.flagged;
  const investigating = detail.investigationStatus === "investigating";

  return (
    <div style={{ display: "grid", gap: spacing[2] }}>
      <Card padding={spacing[3]}>
        <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
          {locked
            ? <ActBtn icon={<Unlock style={AI} />} label="Unlock" onClick={() => setPending("unlock")} />
            : <ActBtn icon={<Lock style={AI} />} label="Lock" onClick={() => setPending("lock")} danger />}
          {archived
            ? <ActBtn icon={<RotateCcw style={AI} />} label="Restore" onClick={() => setPending("restore")} />
            : <ActBtn icon={<Archive style={AI} />} label="Archive" onClick={() => setPending("archive")} />}
          {flagged
            ? <ActBtn icon={<Flag style={AI} />} label="Unflag" onClick={() => setPending("unflag")} />
            : <ActBtn icon={<Flag style={AI} />} label="Flag" onClick={() => setPending("flag")} />}
          {investigating
            ? <ActBtn icon={<ShieldAlert style={AI} />} label="Resolve" onClick={() => setPending("resolve")} />
            : <ActBtn icon={<ShieldAlert style={AI} />} label="Escalate" onClick={() => setPending("escalate")} danger />}
          <ActBtn icon={<Trash2 style={AI} />} label="Delete" onClick={() => setPending("delete")} danger />
        </div>
      </Card>

      <ExportCard chatId={chatId} detail={detail} />

      {pending && (
        <Card padding={spacing[4]} style={{ border: `1px solid ${ACTION_COPY[pending].danger ? colors.danger : surfaces.border}` }}>
          <Text variant="headingSm" color={colors.textPrimary}>{ACTION_COPY[pending].title}</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>{ACTION_COPY[pending].desc}</Text>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (recorded in the audit log)…"
            rows={3}
            style={{ width: "100%", marginTop: spacing[3], resize: "vertical", background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, borderRadius: radii.md, padding: spacing[2], fontSize: 14, color: colors.textPrimary, fontFamily: "inherit" }}
          />
          {err && <Text variant="caption" style={{ color: colors.danger, marginTop: spacing[2] }}>{err}</Text>}
          <div className="flex" style={{ gap: spacing[2], marginTop: spacing[3] }}>
            <Button variant="secondary" onClick={() => { setPending(null); setReason(""); setErr(null); }} disabled={running}>Cancel</Button>
            <div style={{ flex: 1 }} />
            <Button variant={ACTION_COPY[pending].danger ? "danger" : "primary"} loading={running} onClick={run}>{ACTION_COPY[pending].confirm}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const AI = { width: 15, height: 15 } as const;

function ActBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="flex items-center" style={{ gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${danger ? colors.danger : surfaces.border}`, background: surfaces.glassSoft, color: danger ? colors.danger : colors.textPrimary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
      {icon}{label}
    </button>
  );
}

// --------------------------------------------------------------------- export
function ExportCard({ chatId, detail }: { chatId: string; detail: AdminChatDetail }) {
  const [busy, setBusy] = useState(false);

  const fetchAll = async () => {
    const all: AdminChatMessage[] = [];
    let before: string | undefined = undefined;
    // Page backwards until exhausted (bounded by message count).
    for (let i = 0; i < 200; i++) {
      const page: { messages: AdminChatMessage[]; hasMore: boolean } = await getChatMessages({ data: { chatId, before, limit: 100 } });
      all.unshift(...page.messages);
      if (!page.hasMore || page.messages.length === 0) break;
      before = page.messages[0].created_at;
    }
    return all;
  };

  const nameFor = (id: string | null) =>
    id === detail.participantA?.id ? detail.participantA?.name ?? "User A"
      : id === detail.participantB?.id ? detail.participantB?.name ?? "User B"
      : "Unknown";

  const doExport = async (fmt: "csv" | "txt") => {
    setBusy(true);
    try {
      const msgs = await fetchAll();
      const stamp = new Date().toISOString().slice(0, 10);
      if (fmt === "csv") {
        const header = ["created_at", "sender", "kind", "body", "has_image", "has_voice", "reply_to", "read_at", "flagged"];
        const lines = msgs.map((m) =>
          [m.created_at, nameFor(m.sender_id), m.kind, m.body ?? "", m.image_path ? "yes" : "", m.audio_path ? "yes" : "", m.reply_to ?? "", m.read_at ?? "", m.flagged]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        );
        download(`coligo-chat-${chatId.slice(0, 8)}-${stamp}.csv`, [header.join(","), ...lines].join("\n"), "text/csv");
      } else {
        const head = [
          `Coligo conversation export`,
          `Chat: ${chatId}`,
          `Participants: ${nameFor(detail.participantA?.id ?? null)} × ${nameFor(detail.participantB?.id ?? null)}`,
          `Created: ${detail.createdAt}`,
          `Messages: ${msgs.length}`,
          "".padEnd(48, "-"),
          "",
        ].join("\n");
        const body = msgs.map((m) => {
          const kind = m.kind === "image" ? "[image]" : m.kind === "voice" ? "[voice note]" : (m.body ?? "");
          return `[${m.created_at}] ${nameFor(m.sender_id)}: ${kind}${m.flagged ? "  (flagged)" : ""}`;
        }).join("\n");
        download(`coligo-chat-${chatId.slice(0, 8)}-${stamp}.txt`, head + body, "text/plain");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding={spacing[3]}>
      <Text variant="caption" tone="muted">Export full conversation (participants, messages, media & voice metadata, replies, flags).</Text>
      <div className="flex flex-wrap" style={{ gap: spacing[2], marginTop: spacing[2] }}>
        <Button variant="secondary" size="sm" loading={busy} onClick={() => doExport("csv")}><Download style={{ width: 14, height: 14, marginRight: 6 }} /> Export CSV</Button>
        <Button variant="secondary" size="sm" loading={busy} onClick={() => doExport("txt")}><Download style={{ width: 14, height: 14, marginRight: 6 }} /> Export TXT</Button>
      </div>
    </Card>
  );
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------- notes
function NotesTab({ chatId }: { chatId: string }) {
  const qc = useQueryClient();
  const notesQ = useQuery(chatNotesQuery(chatId));
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await addChatNote({ data: { chatId, body: body.trim() } });
      setBody("");
      qc.invalidateQueries({ queryKey: ["admin", "chat", chatId, "notes"] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: spacing[2] }}>
      <Card padding={spacing[4]}>
        <Text variant="caption" tone="muted">Add a private moderator note. Never visible to users.</Text>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write an internal note…"
          rows={3}
          style={{ width: "100%", marginTop: spacing[2], resize: "vertical", background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, borderRadius: radii.md, padding: spacing[2], fontSize: 14, color: colors.textPrimary, fontFamily: "inherit" }}
        />
        <div className="flex" style={{ marginTop: spacing[2] }}>
          <div style={{ flex: 1 }} />
          <Button variant="primary" size="sm" loading={saving} disabled={!body.trim()} onClick={save}><StickyNote style={{ width: 14, height: 14, marginRight: 6 }} /> Save note</Button>
        </div>
      </Card>

      {notesQ.isLoading ? (
        <Skeleton style={{ height: 60, borderRadius: 14 }} />
      ) : (notesQ.data?.length ?? 0) === 0 ? (
        <EmptyStateCard icon={<StickyNote style={{ width: 26, height: 26 }} />} title="No notes yet" description="Internal notes you add will appear here." />
      ) : (
        (notesQ.data ?? []).map((n) => (
          <Card key={n.id} padding={spacing[3]}>
            <Text variant="body" color={colors.textPrimary} style={{ whiteSpace: "pre-wrap" }}>{n.body}</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: spacing[2], display: "block" }}>{n.authorName ?? "Admin"} · {formatDateTime(n.createdAt)}</Text>
          </Card>
        ))
      )}
    </div>
  );
}

// ------------------------------------------------------------------ audit log
function AuditTab({ chatId }: { chatId: string }) {
  const actionsQ = useQuery(chatActionsQuery(chatId));
  if (actionsQ.isLoading) return <Skeleton style={{ height: 80, borderRadius: 14 }} />;
  if ((actionsQ.data?.length ?? 0) === 0) {
    return <EmptyStateCard icon={<FileWarning style={{ width: 26, height: 26 }} />} title="No moderation history" description="Actions taken on this conversation will be logged here." />;
  }
  return (
    <div style={{ display: "grid", gap: spacing[2] }}>
      {(actionsQ.data ?? []).map((a) => (
        <Card key={a.id} padding={spacing[3]}>
          <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
            <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{prettyAction(a.action)}</Text>
            <Text variant="caption" tone="muted">{formatDateTime(a.createdAt)}</Text>
          </div>
          {a.reason && <Text variant="caption" tone="secondary" style={{ marginTop: spacing[1], display: "block" }}>{a.reason}</Text>}
          <Text variant="caption" tone="muted" style={{ marginTop: spacing[1], display: "block" }}>by {a.adminName ?? "Admin"}</Text>
        </Card>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: spacing[4] }}>
      <Skeleton style={{ height: 40, borderRadius: 12, marginBottom: spacing[4] }} />
      <Skeleton style={{ height: 120, borderRadius: 16, marginBottom: spacing[3] }} />
      <div style={{ display: "grid", gap: spacing[2] }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 44, borderRadius: 16, width: i % 2 ? "55%" : "70%", marginLeft: i % 2 ? "auto" : 0 }} />
        ))}
      </div>
    </div>
  );
}
