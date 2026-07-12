// ============================================================================
// /admin/reports/:reportId — Full moderation case view. Real Supabase data via
// admin-gated server functions: overview, reporter, reported user, evidence
// viewer, moderation timeline, internal notes, and in-page (never popup)
// moderator actions incl. the resolution workflow with mandatory audit logging.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  UserRound,
  FileText,
  Clock,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Flame,
  UserCheck,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  reportDetailQuery,
  reportNotesQuery,
  reportActionsQuery,
  addModerationNote,
  assignReport,
  setReportPriority,
  setReportStatus,
  resolveReport,
  type ReportPriority,
  type ReportStatus,
} from "@/lib/admin-reports.functions";
import { adminGuardQuery } from "@/lib/admin.functions";
import { Text, Button, Skeleton, Avatar, Badge } from "@/components/ds/glass";
import { Card, EmptyStateCard, CardDivider } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { ImageViewer } from "@/components/ds/image-viewer";
import {
  ReportStatusBadge,
  PriorityBadge,
  CategoryBadge,
  initialsOf,
  timeAgo,
  shortId,
  prettyStatus,
  prettyCategory,
} from "@/components/admin/report-bits";
import { colors, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/admin/reports/$reportId")({
  head: () => ({
    meta: [
      { title: "Report detail — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportDetailGuard,
});

function ReportDetailGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);
  if (isLoading) return <DetailSkeleton />;
  if (!allowed) return null;
  return <ReportDetail />;
}

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "warn", label: "Warn user" },
  { value: "suspend", label: "Suspend user" },
  { value: "ban", label: "Ban user" },
  { value: "remove_content", label: "Remove content" },
  { value: "no_action", label: "No action needed" },
  { value: "dismiss", label: "Dismiss report" },
];

const PRIORITIES: ReportPriority[] = ["low", "medium", "high", "critical"];
const STATUSES: ReportStatus[] = ["open", "under_review", "escalated", "resolved", "rejected", "archived"];

function ReportDetail() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { reportId } = Route.useParams();

  const detail = useQuery(reportDetailQuery(reportId));
  const notes = useQuery(reportNotesQuery(reportId));
  const actions = useQuery(reportActionsQuery(reportId));
  const me = useQuery({ queryKey: ["admin", "me"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });

  const [viewer, setViewer] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // resolution workflow state
  const [action, setAction] = useState("warn");
  const [resolution, setResolution] = useState("");
  const [targetStatus, setTargetStatus] = useState<"resolved" | "rejected" | "archived">("resolved");
  const [showResolve, setShowResolve] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const d = detail.data;

  const timeline = useMemo(() => actions.data ?? [], [actions.data]);

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError) {
    return (
      <Wrap onBack={() => navigate({ to: "/admin/reports" })}>
        <EmptyStateCard icon={<ShieldAlert style={{ width: 26, height: 26 }} />} title="Failed to load report" description={(detail.error as Error)?.message ?? "Try again."} action={<Button variant="primary" onClick={() => detail.refetch()}>Retry</Button>} />
      </Wrap>
    );
  }
  if (!d) {
    return (
      <Wrap onBack={() => navigate({ to: "/admin/reports" })}>
        <EmptyStateCard icon={<ShieldAlert style={{ width: 26, height: 26 }} />} title="Report not found" description="This report may have been deleted." />
      </Wrap>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      invalidate();
    } catch (e) {
      setErr((e as Error).message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const onAddNote = async () => {
    if (!noteBody.trim()) return;
    setSavingNote(true);
    setErr(null);
    try {
      await addModerationNote({ data: { reportId, body: noteBody.trim() } });
      setNoteBody("");
      qc.invalidateQueries({ queryKey: ["admin", "report", reportId, "notes"] });
    } catch (e) {
      setErr((e as Error).message ?? "Could not save note");
    } finally {
      setSavingNote(false);
    }
  };

  const onResolve = async () => {
    if (!resolution.trim()) {
      setErr("A resolution note is required.");
      return;
    }
    await run(() =>
      resolveReport({ data: { reportId, action: action as never, resolution: resolution.trim(), targetStatus } }),
    );
    setShowResolve(false);
    setResolution("");
  };

  const closed = d.status === "resolved" || d.status === "rejected" || d.status === "archived";

  return (
    <Wrap onBack={() => navigate({ to: "/admin/reports" })}>
      {/* Overview */}
      <Card padding={spacing[4]}>
        <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
          <Text variant="headingSm" color={colors.textPrimary}>{shortId(d.id)}</Text>
          <CategoryBadge category={d.category} />
          <PriorityBadge priority={d.priority} />
          <ReportStatusBadge status={d.status} />
          {d.sourceModule && <Badge tone="neutral">From {d.sourceModule}</Badge>}
        </div>
        <Text variant="body" color={colors.textPrimary} style={{ marginTop: spacing[3], fontWeight: 600 }}>
          {prettyCategory(d.category)} — {d.reason ?? "No reason provided"}
        </Text>
        {d.details && <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>{d.details}</Text>}
        <div className="flex flex-wrap" style={{ gap: spacing[4], marginTop: spacing[3] }}>
          <Meta label="Submitted" value={timeAgo(d.createdAt)} />
          <Meta label="Last updated" value={timeAgo(d.updatedAt)} />
          <Meta label="Assigned" value={d.assignedName ?? "Unassigned"} />
          {d.resolvedAt && <Meta label="Resolved" value={timeAgo(d.resolvedAt)} />}
        </div>
        {d.resolution && (
          <>
            <CardDivider />
            <Text variant="overline" tone="muted">Resolution</Text>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
              {d.actionTaken ? `${prettyCategory(d.actionTaken)} — ` : ""}{d.resolution}
            </Text>
          </>
        )}
      </Card>

      {err && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[2], border: `1px solid ${colors.danger}` }}>
          <Text variant="body" color={colors.danger}>{err}</Text>
        </Card>
      )}

      {/* Moderator actions */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[2] }}>
        <Text variant="overline" tone="muted">Moderator actions</Text>
        <div className="flex flex-wrap" style={{ gap: spacing[2], marginTop: spacing[3] }}>
          <Button size="sm" variant="secondary" leftIcon={<UserCheck style={{ width: 15, height: 15 }} />} disabled={busy || !me.data} onClick={() => me.data && run(() => assignReport({ data: { reportId, moderatorId: me.data! } }))}>
            Assign to me
          </Button>
          <Button size="sm" variant="secondary" leftIcon={<ArrowUpCircle style={{ width: 15, height: 15 }} />} disabled={busy || d.status === "escalated"} onClick={() => run(() => setReportStatus({ data: { reportId, status: "escalated" } }))}>
            Escalate
          </Button>
          <Button size="sm" variant="secondary" leftIcon={<Clock style={{ width: 15, height: 15 }} />} disabled={busy || d.status === "under_review"} onClick={() => run(() => setReportStatus({ data: { reportId, status: "under_review" } }))}>
            Mark under review
          </Button>
          <Button size="sm" variant="primary" leftIcon={<CheckCircle2 style={{ width: 15, height: 15 }} />} disabled={busy} onClick={() => { setShowResolve((v) => !v); setErr(null); }}>
            Resolve / take action
          </Button>
        </div>

        {/* Priority selector */}
        <div style={{ marginTop: spacing[3] }}>
          <Text variant="caption" tone="muted">Priority</Text>
          <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[1] }}>
            {PRIORITIES.map((p) => (
              <button key={p} disabled={busy || p === d.priority} onClick={() => run(() => setReportPriority({ data: { reportId, priority: p } }))} style={pillStyle(p === d.priority)}>
                {p === "critical" && <Flame style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />}
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Status selector */}
        <div style={{ marginTop: spacing[3] }}>
          <Text variant="caption" tone="muted">Status</Text>
          <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[1] }}>
            {STATUSES.map((st) => (
              <button key={st} disabled={busy || st === d.status} onClick={() => run(() => setReportStatus({ data: { reportId, status: st } }))} style={pillStyle(st === d.status)}>
                {prettyStatus(st)}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution workflow (in-page) */}
        {showResolve && (
          <div style={{ marginTop: spacing[4], padding: spacing[3], borderRadius: 12, border: `1px solid ${surfaces.border}`, background: surfaces.glassSoft }}>
            <Text variant="headingSm" color={colors.textPrimary}>Resolution</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: spacing[1], display: "block" }}>
              Choose an enforcement action, write a resolution note (required) and set the final status. Suspend/ban is applied to the reported user immediately and logged.
            </Text>
            <div style={{ marginTop: spacing[3] }}>
              <Text variant="caption" tone="muted">Action</Text>
              <select value={action} onChange={(e) => setAction(e.target.value)} style={selectStyle}>
                {ACTION_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value} style={{ color: "#111" }}>{a.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: spacing[3] }}>
              <Text variant="caption" tone="muted">Final status</Text>
              <div className="flex" style={{ gap: spacing[1], marginTop: spacing[1] }}>
                {(["resolved", "rejected", "archived"] as const).map((t) => (
                  <button key={t} onClick={() => setTargetStatus(t)} style={pillStyle(t === targetStatus)}>{prettyStatus(t)}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: spacing[3] }}>
              <Text variant="caption" tone="muted">Resolution note</Text>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Describe the decision and reasoning…"
                style={textareaStyle}
              />
            </div>
            <div className="flex" style={{ gap: spacing[2], marginTop: spacing[3] }}>
              <Button variant="secondary" onClick={() => setShowResolve(false)} disabled={busy}>Cancel</Button>
              <div style={{ flex: 1 }} />
              <Button variant={action === "ban" || action === "suspend" ? "danger" : "primary"} loading={busy} onClick={onResolve}>Confirm resolution</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Parties */}
      <div style={{ display: "grid", gap: spacing[2], gridTemplateColumns: "1fr", marginTop: spacing[2] }}>
        {/* Reported user */}
        {d.reported && (
          <Card padding={spacing[4]}>
            <Text variant="overline" tone="muted">Reported user</Text>
            <div className="flex items-center" style={{ gap: spacing[3], marginTop: spacing[3] }}>
              <Avatar src={d.reported.avatar ?? undefined} size="lg" initials={initialsOf(d.reported.name)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{d.reported.name ?? "—"}</Text>
                <Text variant="caption" tone="muted">{d.reported.college ?? "—"}</Text>
                <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[1] }}>
                  <Badge tone={d.reported.accountStatus === "active" ? "success" : "danger"}>{d.reported.accountStatus}</Badge>
                  {d.reported.verificationStatus && <Badge tone="neutral">{d.reported.verificationStatus}</Badge>}
                  {(d.reported.reportsReceived ?? 0) > 1 && <Badge tone="warning">{d.reported.reportsReceived} reports</Badge>}
                </div>
              </div>
              <Button size="sm" variant="secondary" rightIcon={<ExternalLink style={{ width: 14, height: 14 }} />} onClick={() => navigate({ to: "/admin/users/$userId", params: { userId: d.reported!.id } })}>
                Open
              </Button>
            </div>
            {d.reported.bio && <Text variant="caption" tone="secondary" style={{ marginTop: spacing[2], display: "block" }}>{d.reported.bio}</Text>}
            {d.reported.photos && d.reported.photos.length > 0 && (
              <>
                <CardDivider />
                <Text variant="caption" tone="muted">Profile photos (snapshot)</Text>
                <div className="flex flex-wrap" style={{ gap: spacing[2], marginTop: spacing[2] }}>
                  {d.reported.photos.map((p) =>
                    p.path ? (
                      <img key={p.id} src={p.path} alt="Reported profile" onClick={() => setViewer(p.path!)} style={thumbStyle} />
                    ) : null,
                  )}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Reporter */}
        {d.reporter && (
          <Card padding={spacing[4]}>
            <Text variant="overline" tone="muted">Reporter</Text>
            <div className="flex items-center" style={{ gap: spacing[3], marginTop: spacing[3] }}>
              <Avatar src={d.reporter.avatar ?? undefined} size="md" initials={initialsOf(d.reporter.name)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{d.reporter.name ?? "—"}</Text>
                <Text variant="caption" tone="muted">{d.reporter.college ?? "—"}</Text>
                <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[1] }}>
                  <Badge tone={d.reporter.accountStatus === "active" ? "success" : "danger"}>{d.reporter.accountStatus}</Badge>
                  <Badge tone="neutral">{d.reporter.reportsSubmitted ?? 0} submitted</Badge>
                </div>
              </div>
              <Button size="sm" variant="secondary" rightIcon={<ExternalLink style={{ width: 14, height: 14 }} />} onClick={() => navigate({ to: "/admin/users/$userId", params: { userId: d.reporter!.id } })}>
                Open
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Evidence */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[2] }}>
        <Text variant="overline" tone="muted">Evidence</Text>
        {d.evidence.length === 0 ? (
          <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[2], color: colors.textMuted }}>
            <ImageIcon style={{ width: 16, height: 16 }} />
            <Text variant="caption" tone="muted">No evidence attached to this report.</Text>
          </div>
        ) : (
          <div style={{ display: "grid", gap: spacing[2], marginTop: spacing[2] }}>
            {d.evidence.map((e) => (
              <div key={e.id} style={{ display: "flex", gap: spacing[2], alignItems: "flex-start" }}>
                {e.kind === "image" && e.path ? (
                  <img src={e.path} alt="Evidence" onClick={() => setViewer(e.path!)} style={thumbStyle} />
                ) : (
                  <div style={{ padding: spacing[2], borderRadius: 8, background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, flex: 1 }}>
                    <div className="flex items-center" style={{ gap: 6, color: colors.textMuted }}>
                      {e.kind === "message" ? <MessageSquare style={{ width: 14, height: 14 }} /> : <FileText style={{ width: 14, height: 14 }} />}
                      <Text variant="caption" tone="muted">{prettyCategory(e.kind)} · {timeAgo(e.createdAt)}</Text>
                    </div>
                    {e.content && <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>{e.content}</Text>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Timeline */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[2] }}>
        <Text variant="overline" tone="muted">Moderation timeline</Text>
        {actions.isLoading ? (
          <Skeleton style={{ height: 60, borderRadius: 10, marginTop: spacing[2] }} />
        ) : timeline.length === 0 ? (
          <Text variant="caption" tone="muted" style={{ marginTop: spacing[2], display: "block" }}>No actions recorded yet.</Text>
        ) : (
          <div style={{ marginTop: spacing[3], display: "grid", gap: spacing[3] }}>
            {timeline.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: spacing[2] }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: colors.primary, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>
                    {prettyCategory(a.action)}
                    {a.previousStatus && a.newStatus ? ` · ${prettyStatus(a.previousStatus)} → ${prettyStatus(a.newStatus)}` : ""}
                  </Text>
                  {a.reason && <Text variant="caption" tone="secondary" style={{ display: "block" }}>{a.reason}</Text>}
                  <Text variant="caption" tone="muted">{a.adminName ?? "Admin"} · {timeAgo(a.createdAt)}</Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Internal notes */}
      <Card padding={spacing[4]} style={{ marginTop: spacing[2], marginBottom: spacing[6] }}>
        <Text variant="overline" tone="muted">Internal moderator notes</Text>
        <Text variant="caption" tone="muted" style={{ display: "block", marginTop: 2 }}>Private — never visible to students.</Text>
        <div style={{ marginTop: spacing[3] }}>
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Add a private note…"
            style={textareaStyle}
          />
          <div className="flex" style={{ marginTop: spacing[2] }}>
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="primary" loading={savingNote} disabled={!noteBody.trim()} onClick={onAddNote}>Add note</Button>
          </div>
        </div>
        {notes.data && notes.data.length > 0 && (
          <div style={{ marginTop: spacing[2], display: "grid", gap: spacing[2] }}>
            {notes.data.map((n) => (
              <div key={n.id} style={{ padding: spacing[2], borderRadius: 10, background: surfaces.glassSoft, border: `1px solid ${surfaces.borderSoft}` }}>
                <Text variant="body" tone="secondary">{n.body}</Text>
                <Text variant="caption" tone="muted" style={{ marginTop: 4, display: "block" }}>{n.authorName ?? "Admin"} · {timeAgo(n.createdAt)}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      {viewer && <ImageViewer src={viewer} onClose={() => setViewer(null)} />}
    </Wrap>
  );
}

// ------------------------------------------------------------------- helpers
function Wrap({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar title="Report detail" onBack={onBack} />

      <div style={{ marginTop: spacing[3] }}>{children}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text variant="caption" tone="muted">{label}</Text>
      <div><Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{value}</Text></div>
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "capitalize",
    cursor: active ? "default" : "pointer",
    border: `1px solid ${active ? colors.primary : surfaces.border}`,
    background: active ? "rgba(10,132,255,0.12)" : surfaces.glassSoft,
    color: active ? colors.primary : colors.textSecondary,
  };
}

const selectStyle: React.CSSProperties = {
  appearance: "none",
  width: "100%",
  marginTop: 6,
  background: surfaces.glassSoft,
  color: colors.textPrimary,
  border: `1px solid ${surfaces.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  background: surfaces.glassSoft,
  color: colors.textPrimary,
  border: `1px solid ${surfaces.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  resize: "vertical",
  fontFamily: "inherit",
};

const thumbStyle: React.CSSProperties = {
  width: 84,
  height: 84,
  objectFit: "cover",
  borderRadius: 10,
  border: `1px solid ${surfaces.border}`,
  cursor: "pointer",
};

function DetailSkeleton() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: spacing[4] }}>
      <Skeleton style={{ height: 40, borderRadius: 12, marginBottom: spacing[4] }} />
      <Skeleton style={{ height: 160, borderRadius: 14, marginBottom: spacing[2] }} />
      <Skeleton style={{ height: 120, borderRadius: 14, marginBottom: spacing[2] }} />
      <Skeleton style={{ height: 200, borderRadius: 14 }} />
    </div>
  );
}
