// ============================================================================
// /admin/chats — Chat Management & Moderation dashboard. Real Supabase data via
// admin-gated server functions. Live stat cards, analytics, server pagination,
// debounced search, multi-filter, sorting, bulk selection + in-page (never
// popup) bulk confirmation, realtime refresh. Non-admins → /admin/login.
// A "chat" is a match (chatId === matchId), rendered read-only for moderation.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessagesSquare,
  Search as SearchIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Archive,
  RotateCcw,
  Lock,
  Unlock,
  Flag,
  ShieldAlert,
  Download,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  chatStatsQuery,
  adminChatsQuery,
  chatAnalyticsQuery,
  lockChat,
  archiveChat,
  flagChat,
  escalateChat,
  type AdminChatRow,
  type AdminChatFilters,
  type ChatSort,
} from "@/lib/admin-chats.functions";
import { adminGuardQuery, logAdminAction } from "@/lib/admin.functions";
import { useAdminChatsRealtime } from "@/lib/use-admin-chats-realtime";
import { Text, Badge, Skeleton, Avatar, Button } from "@/components/ds/glass";
import { Card, StatCard, EmptyStateCard } from "@/components/ds/card";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { AreaTrend, BarSeries, Donut } from "@/components/admin/charts";
import {
  ChatStatusBadge,
  ModerationBadge,
  initialsOf,
  timeAgo,
  shortId,
} from "@/components/admin/chat-bits";
import { colors, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const PAGE_SIZE = 25;

type Search = {
  q?: string;
  status?: string;
  activity?: string;
  college?: string;
  reported?: boolean;
  has_media?: boolean;
  has_voice?: boolean;
  has_replies?: boolean;
  has_reactions?: boolean;
  no_messages?: boolean;
  sort?: ChatSort;
  page?: number;
};

const SORTS: { value: ChatSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "last_activity", label: "Last activity" },
  { value: "most_messages", label: "Most messages" },
  { value: "least_messages", label: "Least messages" },
  { value: "most_media", label: "Most media" },
  { value: "most_reports", label: "Most reports" },
];

export const Route = createFileRoute("/admin/chats/")({
  head: () => ({
    meta: [
      { title: "Chat Management — Coligo Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Chat Management — Coligo Admin" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    activity: typeof s.activity === "string" ? s.activity : undefined,
    college: typeof s.college === "string" ? s.college : undefined,
    reported: s.reported === true || s.reported === "true" ? true : undefined,
    has_media: s.has_media === true || s.has_media === "true" ? true : undefined,
    has_voice: s.has_voice === true || s.has_voice === "true" ? true : undefined,
    has_replies: s.has_replies === true || s.has_replies === "true" ? true : undefined,
    has_reactions: s.has_reactions === true || s.has_reactions === "true" ? true : undefined,
    no_messages: s.no_messages === true || s.no_messages === "true" ? true : undefined,
    sort: typeof s.sort === "string" ? (s.sort as ChatSort) : undefined,
    page: typeof s.page === "number" ? s.page : typeof s.page === "string" ? Number(s.page) || 1 : undefined,
  }),
  component: AdminChatsGuard,
});

function AdminChatsGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError, refetch } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);

  if (isLoading) return <ListSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 420, padding: spacing[6] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Couldn't reach the server</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>Check your connection and try again.</Text>
        <div style={{ marginTop: spacing[4] }}>
          <Button variant="primary" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }
  if (!allowed) return null;
  return <AdminChats />;
}

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

type BulkMode =
  | { kind: "lock" }
  | { kind: "unlock" }
  | { kind: "archive" }
  | { kind: "restore" }
  | { kind: "flag" }
  | { kind: "escalate" }
  | { kind: "export" }
  | null;

function AdminChats() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const wide = useIsWide();
  useAdminChatsRealtime(true);

  const page = search.page && search.page > 0 ? search.page : 1;
  const [term, setTerm] = useState(search.q ?? "");
  const [debounced, setDebounced] = useState(search.q ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<BulkMode>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const stats = useQuery(chatStatsQuery());
  const analytics = useQuery(chatAnalyticsQuery());

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    if ((search.q ?? "") !== debounced) {
      navigate({ to: "/admin/chats", search: (p: Search) => ({ ...p, q: debounced || undefined, page: 1 }), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters: AdminChatFilters = useMemo(() => {
    const f: AdminChatFilters = {};
    if (search.status) f.status = search.status;
    if (search.activity) f.activity = search.activity;
    if (search.college) f.college = search.college;
    if (search.reported) f.reported = true;
    if (search.has_media) f.has_media = true;
    if (search.has_voice) f.has_voice = true;
    if (search.has_replies) f.has_replies = true;
    if (search.has_reactions) f.has_reactions = true;
    if (search.no_messages) f.no_messages = true;
    return f;
  }, [search]);

  const query = useQuery(
    adminChatsQuery({
      search: search.q ?? "",
      filters,
      sort: search.sort ?? "newest",
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setFilter = (patch: Partial<Search>) =>
    navigate({ to: "/admin/chats", search: (p: Search) => ({ ...p, ...patch, page: 1 }), replace: true });

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAllPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });

  const onLogout = async () => {
    haptic("light");
    try { await logAdminAction({ data: { action: "admin_logout" } }); } catch { /* ignore */ }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  const selectedRows = rows.filter((r) => selected.has(r.id));

  const runBulk = async () => {
    if (!bulk) return;
    setRunning(true);
    setResult(null);
    const ids = Array.from(selected);

    if (bulk.kind === "export") {
      exportCsv(selectedRows);
      setRunning(false);
      setBulk(null);
      return;
    }

    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        if (bulk.kind === "lock") await lockChat({ data: { chatId: id, value: true } });
        else if (bulk.kind === "unlock") await lockChat({ data: { chatId: id, value: false } });
        else if (bulk.kind === "archive") await archiveChat({ data: { chatId: id, value: false } });
        else if (bulk.kind === "restore") await archiveChat({ data: { chatId: id, value: true } });
        else if (bulk.kind === "flag") await flagChat({ data: { chatId: id, value: true } });
        else if (bulk.kind === "escalate") await escalateChat({ data: { chatId: id, status: "investigating" } });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setResult({ ok, fail });
    setRunning(false);
    setSelected(new Set());
    setBulk(null);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const s = stats.data;
  const a = analytics.data;

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar
        title="Chat Management"
        onBack={() => navigate({ to: "/admin/dashboard" })}
        trailing={
          <button onClick={onLogout} aria-label="Sign out" style={{ display: "flex", padding: 8, color: colors.textSecondary, background: "transparent", border: "none", cursor: "pointer" }}>
            <LogOut style={{ width: 20, height: 20 }} />
          </button>
        }
      />

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: spacing[2], marginTop: spacing[4] }}>
        <StatCard label="Conversations" value={s ? s.totalConversations.toLocaleString() : "—"} icon={<MessagesSquare style={{ width: 18, height: 18 }} />} />
        <StatCard label="Active" value={s ? s.activeConversations.toLocaleString() : "—"} />
        <StatCard label="Archived" value={s ? s.archivedConversations.toLocaleString() : "—"} />
        <StatCard label="Locked" value={s ? s.lockedConversations.toLocaleString() : "—"} />
        <StatCard label="Messages today" value={s ? s.messagesToday.toLocaleString() : "—"} />
        <StatCard label="Messages / week" value={s ? s.messagesWeek.toLocaleString() : "—"} />
        <StatCard label="Images shared" value={s ? s.imagesShared.toLocaleString() : "—"} />
        <StatCard label="Voice notes" value={s ? s.voiceNotes.toLocaleString() : "—"} />
        <StatCard label="Reactions" value={s ? s.reactions.toLocaleString() : "—"} />
        <StatCard label="Replies" value={s ? s.replies.toLocaleString() : "—"} />
        <StatCard label="Reported" value={s ? s.reported.toLocaleString() : "—"} />
        <StatCard label="Under review" value={s ? s.underReview.toLocaleString() : "—"} />
        <StatCard label="Avg length" value={s ? String(s.avgLength) : "—"} />
        <StatCard label="Avg msgs / match" value={s ? String(s.avgMessagesPerMatch) : "—"} />
        <StatCard label="Active chatters" value={s ? s.activeChatters.toLocaleString() : "—"} />
        <StatCard label="Chats today" value={s ? s.chatsToday.toLocaleString() : "—"} />
      </div>

      {/* Analytics */}
      {a && (
        <div style={{ display: "grid", gridTemplateColumns: wide ? "2fr 1fr" : "1fr", gap: spacing[2], marginTop: spacing[3] }}>
          <AreaTrend title="Messages per day" subtitle="Last 30 days" data={a.messagesByDay} xKey="day" series={[{ key: "count", label: "Messages" }]} />
          <Donut title="Most active colleges" data={(a.byCollege ?? []).map((c) => ({ name: c.name, value: c.count }))} />
          <BarSeries title="Images shared" subtitle="Last 30 days" data={a.mediaByDay} xKey="day" dataKey="images" />
          <BarSeries title="Voice notes shared" subtitle="Last 30 days" data={a.mediaByDay} xKey="day" dataKey="voice" color={colors.accent} />
        </div>
      )}

      {/* Search + sort */}
      <div style={{ marginTop: spacing[4] }}>
        <SearchBar value={term} onChange={setTerm} placeholder="Search by chat, user, phone, college…" icon={<SearchIcon style={{ width: 18, height: 18 }} />} />
      </div>

      <div className="flex flex-wrap items-end" style={{ gap: spacing[2], marginTop: spacing[3] }}>
        <FilterSelect label="Status" value={search.status ?? ""} onChange={(v) => setFilter({ status: v || undefined })} options={[["", "All"], ["active", "Active"], ["archived", "Archived"], ["locked", "Locked"], ["reported", "Reported"]]} />
        <FilterSelect label="Colleges" value={search.college ?? ""} onChange={(v) => setFilter({ college: v || undefined })} options={[["", "Any"], ["same", "Same college"], ["different", "Different"]]} />
        <FilterSelect label="Activity" value={search.activity ?? ""} onChange={(v) => setFilter({ activity: v || undefined })} options={[["", "Any"], ["high", "High (20+)"], ["low", "Low (1–19)"]]} />
        <FilterSelect label="Sort" value={search.sort ?? "newest"} onChange={(v) => setFilter({ sort: v as ChatSort })} options={SORTS.map((so) => [so.value, so.label] as [string, string])} />
      </div>

      <div className="flex flex-wrap items-center" style={{ gap: spacing[2], marginTop: spacing[3] }}>
        <ToggleChip label="Reported" active={!!search.reported} onClick={() => setFilter({ reported: search.reported ? undefined : true })} />
        <ToggleChip label="Has media" active={!!search.has_media} onClick={() => setFilter({ has_media: search.has_media ? undefined : true })} />
        <ToggleChip label="Has voice" active={!!search.has_voice} onClick={() => setFilter({ has_voice: search.has_voice ? undefined : true })} />
        <ToggleChip label="Has replies" active={!!search.has_replies} onClick={() => setFilter({ has_replies: search.has_replies ? undefined : true })} />
        <ToggleChip label="Has reactions" active={!!search.has_reactions} onClick={() => setFilter({ has_reactions: search.has_reactions ? undefined : true })} />
        <ToggleChip label="No messages" active={!!search.no_messages} onClick={() => setFilter({ no_messages: search.no_messages ? undefined : true })} />
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3] }}>
          <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
            <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{selected.size} selected</Text>
            <div style={{ flex: 1 }} />
            <BulkBtn icon={<Lock style={I} />} label="Lock" onClick={() => setBulk({ kind: "lock" })} />
            <BulkBtn icon={<Unlock style={I} />} label="Unlock" onClick={() => setBulk({ kind: "unlock" })} />
            <BulkBtn icon={<Archive style={I} />} label="Archive" onClick={() => setBulk({ kind: "archive" })} />
            <BulkBtn icon={<RotateCcw style={I} />} label="Restore" onClick={() => setBulk({ kind: "restore" })} />
            <BulkBtn icon={<Flag style={I} />} label="Flag" onClick={() => setBulk({ kind: "flag" })} />
            <BulkBtn icon={<ShieldAlert style={I} />} label="Escalate" onClick={() => setBulk({ kind: "escalate" })} />
            <BulkBtn icon={<Download style={I} />} label="Export" onClick={() => setBulk({ kind: "export" })} />
          </div>
        </Card>
      )}

      {bulk && (
        <BulkConfirm mode={bulk} rows={selectedRows} count={selected.size} running={running} onCancel={() => setBulk(null)} onConfirm={runBulk} />
      )}

      {result && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3] }}>
          <Text variant="caption" tone="secondary">Done — {result.ok} succeeded{result.fail > 0 ? `, ${result.fail} failed` : ""}.</Text>
        </Card>
      )}

      {/* Results */}
      <div style={{ marginTop: spacing[3] }}>
        {query.isLoading ? (
          <ListSkeleton bare />
        ) : query.isError ? (
          <EmptyStateCard icon={<MessagesSquare style={{ width: 26, height: 26 }} />} title="Failed to load conversations" description="Your filters are preserved — try again." action={<Button variant="primary" onClick={() => query.refetch()}>Retry</Button>} />
        ) : rows.length === 0 ? (
          <EmptyStateCard icon={<MessagesSquare style={{ width: 26, height: 26 }} />} title="No conversations found" description="No conversations match your search and filters." />
        ) : wide ? (
          <ChatTableView rows={rows} selected={selected} allOnPage={allOnPage} onToggleAll={toggleAllPage} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/chats/$chatId", params: { chatId: id } })} />
        ) : (
          <ChatCardsView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/chats/$chatId", params: { chatId: id } })} />
        )}
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex items-center justify-center" style={{ gap: spacing[3], marginTop: spacing[4] }}>
          <button disabled={page <= 1} onClick={() => navigate({ to: "/admin/chats", search: (p: Search) => ({ ...p, page: page - 1 }) })} style={pagerStyle(page <= 1)}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
          </button>
          <Text variant="caption" tone="muted">Page {page} of {totalPages}</Text>
          <button disabled={page >= totalPages} onClick={() => navigate({ to: "/admin/chats", search: (p: Search) => ({ ...p, page: page + 1 }) })} style={pagerStyle(page >= totalPages)}>
            Next <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}

const I = { width: 15, height: 15 } as const;

function BulkBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center" style={{ gap: 6, padding: "7px 12px", borderRadius: 10, border: `1px solid ${surfaces.border}`, background: surfaces.glassSoft, color: colors.textPrimary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
      {icon}{label}
    </button>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${active ? colors.primary : surfaces.border}`, background: active ? "rgba(10,132,255,0.10)" : surfaces.glassSoft, color: active ? colors.primary : colors.textSecondary }}>
      {label}
    </button>
  );
}

// ---------------------------------------------------------- participants cell
function Participants({ r }: { r: AdminChatRow }) {
  return (
    <div className="flex items-center" style={{ gap: spacing[2] }}>
      <div className="flex items-center" style={{ marginRight: 4 }}>
        <Avatar src={r.user_a_avatar ?? undefined} size="sm" initials={initialsOf(r.user_a_name)} />
        <div style={{ marginLeft: -8 }}>
          <Avatar src={r.user_b_avatar ?? undefined} size="sm" initials={initialsOf(r.user_b_name)} />
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>
          {(r.user_a_name ?? "—")} × {(r.user_b_name ?? "—")}
        </Text>
        <div><Text variant="caption" tone="muted">{r.college_a ?? "—"}{!r.same_college ? ` · ${r.college_b ?? "—"}` : ""}</Text></div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- table (wide)
function ChatTableView({ rows, selected, allOnPage, onToggleAll, onToggle, onOpen }: { rows: AdminChatRow[]; selected: Set<string>; allOnPage: boolean; onToggleAll: () => void; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: colors.textMuted, borderBottom: `1px solid ${surfaces.border}` }}>
              <th style={thStyle}><input type="checkbox" checked={allOnPage} onChange={onToggleAll} style={{ width: 16, height: 16, cursor: "pointer" }} /></th>
              <th style={thStyle}>Chat</th>
              <th style={thStyle}>Participants</th>
              <th style={thStyle}>Msgs</th>
              <th style={thStyle}>Img</th>
              <th style={thStyle}>Voice</th>
              <th style={thStyle}>Reports</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Moderation</th>
              <th style={thStyle}>Last active</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${surfaces.borderSoft}`, background: selected.has(r.id) ? "rgba(10,132,255,0.06)" : undefined }}>
                <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                </td>
                <td style={{ ...tdStyle, cursor: "pointer" }} onClick={() => onOpen(r.id)}>
                  <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{shortId(r.id)}</Text>
                </td>
                <td style={{ ...tdStyle, cursor: "pointer" }} onClick={() => onOpen(r.id)}><Participants r={r} /></td>
                <td style={tdStyle}><Text variant="caption" tone="secondary">{r.total_messages}</Text></td>
                <td style={tdStyle}><Text variant="caption" tone="muted">{r.images}</Text></td>
                <td style={tdStyle}><Text variant="caption" tone="muted">{r.voice}</Text></td>
                <td style={tdStyle}>{r.reports_count > 0 ? <Badge tone="warning">{r.reports_count}</Badge> : <Text variant="caption" tone="muted">0</Text>}</td>
                <td style={tdStyle}><ChatStatusBadge status={r.status} locked={r.conversation_disabled} /></td>
                <td style={tdStyle}><ModerationBadge flagged={r.flagged} investigationStatus={r.investigation_status} /></td>
                <td style={tdStyle}><Text variant="caption" tone="muted">{timeAgo(r.last_activity)}</Text></td>
                <td style={tdStyle}>
                  <button onClick={() => onOpen(r.id)} aria-label="Open conversation" style={{ display: "flex", padding: 6, color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
                    <ChevronRight style={{ width: 18, height: 18 }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- cards (narrow)
function ChatCardsView({ rows, selected, onToggle, onOpen }: { rows: AdminChatRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gap: spacing[2] }}>
      {rows.map((r) => (
        <Card key={r.id} padding={spacing[3]} style={{ background: selected.has(r.id) ? "rgba(10,132,255,0.06)" : undefined }}>
          <div className="flex items-start" style={{ gap: spacing[2] }}>
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} style={{ width: 16, height: 16, marginTop: 4, cursor: "pointer" }} />
            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpen(r.id)}>
              <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
                <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{shortId(r.id)}</Text>
                <ChatStatusBadge status={r.status} locked={r.conversation_disabled} />
              </div>
              <div style={{ marginTop: spacing[2] }}><Participants r={r} /></div>
              <div className="flex flex-wrap items-center" style={{ gap: spacing[2], marginTop: spacing[2] }}>
                <Text variant="caption" tone="muted">{r.total_messages} msgs · {r.images} img · {r.voice} voice</Text>
                {r.reports_count > 0 && <Badge tone="warning">{r.reports_count} reports</Badge>}
                <ModerationBadge flagged={r.flagged} investigationStatus={r.investigation_status} />
                <Text variant="caption" tone="muted">{timeAgo(r.last_activity)}</Text>
              </div>
            </div>
            <button onClick={() => onOpen(r.id)} aria-label="Open conversation" style={{ display: "flex", padding: 6, color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
              <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// --------------------------------------------------------- bulk confirmation
const BULK_COPY: Record<string, { title: string; desc: string; danger: boolean }> = {
  lock: { title: "Lock conversations", desc: "Participants can no longer send messages in these conversations.", danger: true },
  unlock: { title: "Unlock conversations", desc: "Re-enable messaging for participants.", danger: false },
  archive: { title: "Archive conversations", desc: "Hide these conversations from the active queue. Data is preserved.", danger: false },
  restore: { title: "Restore conversations", desc: "Return these conversations to the active queue.", danger: false },
  flag: { title: "Flag conversations", desc: "Flag these conversations for moderation review.", danger: false },
  escalate: { title: "Escalate to investigation", desc: "Mark these conversations as under review.", danger: true },
  export: { title: "Export conversations", desc: "Download the selected conversations as a CSV file.", danger: false },
};

function BulkConfirm({ mode, rows, count, running, onCancel, onConfirm }: { mode: NonNullable<BulkMode>; rows: AdminChatRow[]; count: number; running: boolean; onCancel: () => void; onConfirm: () => void }) {
  const copy = BULK_COPY[mode.kind];
  return (
    <Card padding={spacing[4]} style={{ marginTop: spacing[3], border: `1px solid ${copy.danger ? colors.danger : surfaces.border}` }}>
      <Text variant="headingSm" color={colors.textPrimary}>{copy.title} — {count} selected</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>{copy.desc}</Text>
      <div style={{ marginTop: spacing[3], maxHeight: 160, overflowY: "auto", display: "grid", gap: spacing[1] }}>
        {rows.slice(0, 8).map((r) => (
          <Text key={r.id} variant="caption" tone="muted">{shortId(r.id)} — {r.user_a_name ?? "—"} × {r.user_b_name ?? "—"}</Text>
        ))}
        {rows.length > 8 && <Text variant="caption" tone="muted">+ {rows.length - 8} more…</Text>}
      </div>
      <div className="flex" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        <Button variant="secondary" onClick={onCancel} disabled={running}>Cancel</Button>
        <div style={{ flex: 1 }} />
        <Button variant={copy.danger ? "danger" : "primary"} loading={running} onClick={onConfirm}>Confirm</Button>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------- helpers
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textMuted, paddingLeft: 4 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", background: surfaces.glassSoft, color: colors.textPrimary, border: `1px solid ${surfaces.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} style={{ color: "#111" }}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function exportCsv(rows: AdminChatRow[]) {
  const header = ["id", "user_a", "user_b", "college_a", "college_b", "status", "locked", "total_messages", "images", "voice", "replies", "reactions", "reports", "created_at", "last_activity"];
  const lines = rows.map((r) =>
    [r.id, r.user_a_name ?? "", r.user_b_name ?? "", r.college_a ?? "", r.college_b ?? "", r.status, r.conversation_disabled, r.total_messages, r.images, r.voice, r.replies, r.reactions, r.reports_count, r.created_at, r.last_activity ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `coligo-chats-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function pagerStyle(disabled: boolean): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 10, border: `1px solid ${surfaces.border}`, background: surfaces.glassSoft, color: disabled ? colors.textMuted : colors.textPrimary, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 };
}

const thStyle: React.CSSProperties = { padding: "12px 14px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 14px", verticalAlign: "middle", whiteSpace: "nowrap" };

function ListSkeleton({ bare = false }: { bare?: boolean }) {
  const body = (
    <div style={{ display: "grid", gap: spacing[2] }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} style={{ height: 64, borderRadius: 14 }} />
      ))}
    </div>
  );
  if (bare) return body;
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4] }}>
      <Skeleton style={{ height: 40, borderRadius: 12, marginBottom: spacing[4] }} />
      {body}
    </div>
  );
}
