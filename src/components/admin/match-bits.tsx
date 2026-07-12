// ============================================================================
// Shared presentational bits for the admin match management module. Pure DS
// composition — no data fetching, no restyling of tokens.
// ============================================================================
import { Badge } from "@/components/ds/glass";

type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "accent";

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "success",
  archived: "neutral",
  unmatched: "warning",
  deleted: "danger",
};

const CONVO_TONE: Record<string, BadgeTone> = {
  active: "info",
  no_messages: "neutral",
};

export function MatchStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{cap(status)}</Badge>;
}

export function ConversationBadge({ status }: { status: string }) {
  return <Badge tone={CONVO_TONE[status] ?? "neutral"}>{status === "no_messages" ? "No messages" : "Conversing"}</Badge>;
}

export function FlagBadge({ flagged, suspicious }: { flagged: boolean; suspicious: boolean }) {
  if (suspicious) return <Badge tone="danger" dot pulse>Suspicious</Badge>;
  if (flagged) return <Badge tone="warning" dot>Flagged</Badge>;
  return null;
}

export function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function shortId(id: string) {
  return `#${id.slice(0, 8)}`;
}

export function initialsOf(name: string | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return "?";
}

export function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDuration(secs: number) {
  if (!secs || secs < 0) return "—";
  const days = Math.floor(secs / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(secs / 3600);
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(secs / 60);
  return `${mins}m`;
}

export function prettyAction(a: string) {
  return a
    .split("_")
    .map((w) => cap(w))
    .join(" ");
}
