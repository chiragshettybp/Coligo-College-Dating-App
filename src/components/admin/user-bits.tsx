// ============================================================================
// Shared presentational bits for the admin user module. Pure DS composition —
// no data fetching, no restyling of tokens.
// ============================================================================
import { Badge } from "@/components/ds/glass";

type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "accent";

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "success",
  suspended: "warning",
  banned: "danger",
  deleted: "neutral",
};

const VERIFY_TONE: Record<string, BadgeTone> = {
  verified: "success",
  pending: "warning",
  unverified: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{cap(status)}</Badge>;
}

export function VerificationBadge({ status }: { status: string }) {
  return (
    <Badge tone={VERIFY_TONE[status] ?? "neutral"} dot>
      {cap(status)}
    </Badge>
  );
}

export function OnlineDot({ online }: { online: boolean }) {
  return (
    <Badge tone={online ? "success" : "neutral"} dot pulse={online}>
      {online ? "Online" : "Offline"}
    </Badge>
  );
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initialsOf(name: string | null, phone: string | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (phone ?? "?").slice(-2);
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

export function prettyGender(g: string | null) {
  if (!g) return "—";
  if (g === "man") return "Man";
  if (g === "woman") return "Woman";
  if (g === "nonbinary") return "Non-binary";
  return cap(g);
}
