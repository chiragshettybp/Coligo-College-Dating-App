// ============================================================================
// Shared presentational bits for the admin reports & moderation module. Pure DS
// composition — no data fetching, no restyling of tokens.
// ============================================================================
import { Badge } from "@/components/ds/glass";

type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "accent";

const STATUS_TONE: Record<string, BadgeTone> = {
  open: "info",
  under_review: "primary",
  escalated: "warning",
  resolved: "success",
  rejected: "neutral",
  archived: "neutral",
};

const PRIORITY_TONE: Record<string, BadgeTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
};

export function ReportStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{prettyStatus(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge tone={PRIORITY_TONE[priority] ?? "neutral"} dot pulse={priority === "critical"}>
      {cap(priority)}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: string | null }) {
  return <Badge tone="neutral">{prettyCategory(category)}</Badge>;
}

export function prettyStatus(s: string) {
  return s
    .split("_")
    .map((w) => cap(w))
    .join(" ");
}

export function prettyCategory(c: string | null) {
  if (!c) return "Other";
  return c
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((w) => cap(w))
    .join(" ");
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

export const CATEGORY_OPTIONS: [string, string][] = [
  ["", "All categories"],
  ["spam", "Spam"],
  ["harassment", "Harassment"],
  ["fake_profile", "Fake profile"],
  ["inappropriate_images", "Inappropriate images"],
  ["abuse", "Abuse"],
  ["impersonation", "Impersonation"],
  ["scam", "Scam"],
  ["safety", "Safety"],
  ["other", "Other"],
];
