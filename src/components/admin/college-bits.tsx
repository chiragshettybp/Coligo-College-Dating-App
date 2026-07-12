// ============================================================================
// Shared presentational bits for the admin college module. Pure DS composition.
// ============================================================================
import { Badge } from "@/components/ds/glass";

type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "accent";

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "success",
  disabled: "warning",
  archived: "neutral",
};

export function CollegeStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{cap(status)}</Badge>;
}

export function DiscoveryBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge tone={enabled ? "info" : "neutral"} dot>
      {enabled ? "Discovery on" : "Discovery off"}
    </Badge>
  );
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function collegeInitials(name: string | null) {
  if (!name || !name.trim()) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
