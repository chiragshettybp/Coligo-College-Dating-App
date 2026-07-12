// ============================================================================
// Notification visuals — one place that maps a notification category to its
// icon, accent tone and human label, so the list, detail and delete screens
// all render identically. Design-system tokens only.
// ============================================================================
import type { ComponentType } from "react";
import {
  Sparkles,
  MessageCircle,
  Megaphone,
  ShieldAlert,
  UserRound,
  Bell,
} from "lucide-react";

import { gradients } from "@/lib/ds";

type IconProps = { style?: React.CSSProperties };

/** Mirrors the Badge tone union from the design system. */
export type BadgeTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "accent";

export type CategoryVisual = {
  Icon: ComponentType<IconProps>;
  tone: BadgeTone;
  label: string;
  /** Gradient background for the icon chip. */
  chip: string;
};

const VISUALS: Record<string, CategoryVisual> = {
  matches: { Icon: Sparkles, tone: "accent", label: "Match", chip: gradients.pink },
  messages: { Icon: MessageCircle, tone: "primary", label: "Message", chip: gradients.primaryButton },
  system: { Icon: Megaphone, tone: "info", label: "Announcement", chip: gradients.blueGloss },
  security: { Icon: ShieldAlert, tone: "danger", label: "Security", chip: gradients.pink },
  account: { Icon: UserRound, tone: "neutral", label: "Account", chip: gradients.blueGloss },
};

export function categoryVisual(category: string): CategoryVisual {
  return VISUALS[category] ?? { Icon: Bell, tone: "neutral", label: "Notice", chip: gradients.blueGloss };
}

export function priorityTone(priority: string): BadgeTone | null {
  switch (priority) {
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    default:
      return null;
  }
}

/** Relative timestamp, matching the compact style used across the app. */
export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

/** Full accessible timestamp for detail screens / aria-labels. */
export function fullTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
