// ============================================================================
// Shared presentational bits for the admin chat moderation module. Pure DS
// composition — no data fetching, no restyling of tokens.
// ============================================================================
import { Badge } from "@/components/ds/glass";

type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "accent";

export function ChatStatusBadge({ status, locked }: { status: string; locked?: boolean }) {
  if (locked) return <Badge tone="danger" dot>Locked</Badge>;
  const tone: BadgeTone =
    status === "active" ? "success" : status === "archived" ? "neutral" : status === "deleted" ? "danger" : "warning";
  return <Badge tone={tone}>{cap(status)}</Badge>;
}

export function ModerationBadge({
  flagged,
  investigationStatus,
}: {
  flagged: boolean;
  investigationStatus: string;
}) {
  if (investigationStatus === "investigating") return <Badge tone="danger" dot pulse>Under review</Badge>;
  if (flagged) return <Badge tone="warning" dot>Flagged</Badge>;
  return <Badge tone="neutral">Clean</Badge>;
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

export function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function prettyAction(a: string) {
  return a
    .split("_")
    .map((w) => cap(w))
    .join(" ");
}

const TIMELINE_LABELS: Record<string, string> = {
  match_created: "Match created",
  first_message: "First message",
  first_image: "First image shared",
  first_voice: "First voice note",
  archived: "Conversation archived",
  locked: "Conversation locked",
  unmatched: "Users unmatched",
};

export function timelineLabel(type: string) {
  return TIMELINE_LABELS[type] ?? prettyAction(type);
}
