// ============================================================================
// Empty State System — one reusable surface for every zero-data moment.
// ----------------------------------------------------------------------------
// Empty states are not missing content — they are guidance. Each one pairs a
// bespoke, gently-breathing illustration with supportive copy and a clear next
// step. Minimal, content-first, soft colors, generous whitespace. Every value
// inherits from the design tokens in "@/lib/ds"; nothing is hardcoded.
// ============================================================================

import type { ReactNode } from "react";
import { Card } from "@/components/ds/card";
import { Button } from "@/components/ds/glass";
import {
  colors,
  radii,
  spacing,
  surfaces,
  type as type_,
} from "@/lib/ds";

/* ------------------------------------------------------------------ palette -- */
/** Soft, low-saturation accent tones. Each scene picks one — never bright. */

const tones = {
  primary: { tint: "#0a84ff", soft: "rgba(10,132,255,0.10)", ring: "rgba(10,132,255,0.16)" },
  pink: { tint: "#ff5e79", soft: "rgba(255,94,121,0.10)", ring: "rgba(255,94,121,0.16)" },
  violet: { tint: "#7a6bff", soft: "rgba(122,107,255,0.10)", ring: "rgba(122,107,255,0.16)" },
  amber: { tint: "#f5a623", soft: "rgba(245,166,35,0.10)", ring: "rgba(245,166,35,0.16)" },
  teal: { tint: "#12b3a6", soft: "rgba(18,179,166,0.10)", ring: "rgba(18,179,166,0.16)" },
  slate: { tint: "#7c8698", soft: "rgba(124,134,152,0.10)", ring: "rgba(124,134,152,0.14)" },
} as const;

export type EmptyTone = keyof typeof tones;

/* ------------------------------------------------------------ Illustration -- */
/** Layered scene: soft gradient tile · breathing hairline rings · bespoke
 *  glyph that drifts. `scene` selects the hand-built artwork. */

export type EmptyScene =
  | "matches"
  | "messages"
  | "likes"
  | "notifications"
  | "search"
  | "offline"
  | "permission"
  | "profile"
  | "photos"
  | "college"
  | "interests"
  | "loading"
  | "error"
  | "deleted"
  | "blocked"
  | "welcome";

function SceneArt({ scene, tint }: { scene: EmptyScene; tint: string }) {
  const s = { stroke: tint, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const soft = { fill: tint, opacity: 0.14 };
  switch (scene) {
    case "matches":
      return (
        <g>
          <path {...s} d="M32 44c-9-6-15-12-15-19a8 8 0 0 1 15-3 8 8 0 0 1 15 3c0 7-6 13-15 19Z" />
          <circle cx="46" cy="20" r="10" {...soft} />
          <path d="M46 16v8M42 20h8" {...s} strokeWidth={2.2} />
        </g>
      );
    case "messages":
      return (
        <g>
          <path {...s} d="M14 22a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H26l-8 7v-7h-4Z" />
          <circle cx="26" cy="29" r="2" fill={tint} />
          <circle cx="34" cy="29" r="2" fill={tint} />
          <circle cx="42" cy="29" r="2" fill={tint} />
        </g>
      );
    case "likes":
      return (
        <g>
          <circle cx="32" cy="30" r="16" {...soft} />
          <path {...s} d="M32 40c-7-4.5-11-9-11-14a6 6 0 0 1 11-2.2A6 6 0 0 1 43 26c0 5-4 9.5-11 14Z" />
        </g>
      );
    case "notifications":
      return (
        <g>
          <path {...s} d="M22 40c-2 0-3-1-2-3l2-4v-7a10 10 0 0 1 20 0v7l2 4c1 2 0 3-2 3Z" />
          <path {...s} d="M28 44a4 4 0 0 0 8 0" />
          <circle cx="42" cy="18" r="6" {...soft} />
        </g>
      );
    case "search":
      return (
        <g>
          <circle cx="29" cy="27" r="12" {...s} />
          <path {...s} d="M38 36l8 8" />
          <path {...s} d="M24 27h10" strokeWidth={2} opacity={0.6} />
        </g>
      );
    case "offline":
      return (
        <g>
          <path {...s} d="M14 26c10-9 26-9 36 0M20 32c6-5 18-5 24 0M27 38c3-2.5 7-2.5 10 0" />
          <circle cx="32" cy="43" r="2.2" fill={tint} />
          <path {...s} d="M12 12l40 40" strokeWidth={2.2} />
        </g>
      );
    case "permission":
      return (
        <g>
          <rect x="20" y="26" width="24" height="18" rx="4" {...s} />
          <path {...s} d="M25 26v-4a7 7 0 0 1 14 0v4" />
          <circle cx="32" cy="34" r="2.4" fill={tint} />
        </g>
      );
    case "profile":
      return (
        <g>
          <circle cx="32" cy="24" r="8" {...s} />
          <path {...s} d="M18 44a14 14 0 0 1 28 0" />
          <circle cx="45" cy="21" r="7" {...soft} />
          <path d="M45 18v6M42 21h6" {...s} strokeWidth={2} />
        </g>
      );
    case "photos":
      return (
        <g>
          <rect x="16" y="20" width="32" height="24" rx="5" {...s} />
          <circle cx="25" cy="28" r="3" {...s} strokeWidth={2} />
          <path {...s} d="M20 42l8-8 5 5 6-7 9 10" />
        </g>
      );
    case "college":
      return (
        <g>
          <path {...s} d="M32 18l18 8-18 8-18-8Z" />
          <path {...s} d="M22 30v8c0 3 5 6 10 6s10-3 10-6v-8" />
          <path {...s} d="M50 26v9" strokeWidth={2} />
        </g>
      );
    case "interests":
      return (
        <g>
          <circle cx="24" cy="24" r="6" {...s} />
          <circle cx="42" cy="24" r="6" {...soft} />
          <circle cx="24" cy="42" r="6" {...soft} />
          <circle cx="42" cy="42" r="6" {...s} />
          <path d="M30 24h6M24 30v6M42 30v6M30 42h6" {...s} strokeWidth={1.8} opacity={0.5} />
        </g>
      );
    case "loading":
      return (
        <g>
          <circle cx="32" cy="32" r="14" {...s} opacity={0.25} />
          <path {...s} d="M32 18a14 14 0 0 1 14 14" />
        </g>
      );
    case "error":
      return (
        <g>
          <path {...s} d="M32 16l18 32H14Z" />
          <path {...s} d="M32 28v9" />
          <circle cx="32" cy="43" r="1.8" fill={tint} />
        </g>
      );
    case "deleted":
      return (
        <g>
          <path {...s} d="M20 24h24l-2 20a4 4 0 0 1-4 3.6H26a4 4 0 0 1-4-3.6Z" />
          <path {...s} d="M26 24v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3M28 32v9M36 32v9" strokeWidth={2} />
        </g>
      );
    case "blocked":
      return (
        <g>
          <circle cx="32" cy="32" r="15" {...s} />
          <path {...s} d="M22 22l20 20" />
          <circle cx="32" cy="32" r="20" {...soft} />
        </g>
      );
    case "welcome":
      return (
        <g>
          <path {...s} d="M32 16l4.6 9.6L47 27l-7.5 7.3L41.2 45 32 39.8 22.8 45l1.7-10.7L17 27l10.4-1.4Z" />
          <circle cx="46" cy="18" r="2.4" {...soft} />
          <circle cx="18" cy="20" r="1.8" fill={tint} opacity={0.5} />
        </g>
      );
  }
}

export function EmptyIllustration({
  scene,
  tone = "slate",
  size = 132,
}: {
  scene: EmptyScene;
  tone?: EmptyTone;
  size?: number;
}) {
  const t = tones[tone];
  return (
    <div
      aria-hidden
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* soft gradient tile */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: radii.xl,
          background: `radial-gradient(120% 120% at 50% 20%, ${t.soft} 0%, rgba(255,255,255,0) 70%)`,
        }}
      />
      {/* breathing hairline rings */}
      <div
        className="ds-es-ring absolute"
        style={{
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: "50%",
          border: `1px solid ${t.ring}`,
        }}
      />
      <div
        className="ds-es-ring absolute"
        style={{
          width: size * 0.58,
          height: size * 0.58,
          borderRadius: "50%",
          border: `1px solid ${t.ring}`,
          animationDelay: "0.6s",
        }}
      />
      {/* bespoke drifting glyph */}
      <svg
        className="ds-es-drift relative"
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 64 64"
        fill="none"
      >
        <SceneArt scene={scene} tint={t.tint} />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState -- */

export function EmptyState({
  scene,
  tone = "slate",
  title,
  description,
  primaryAction,
  secondaryAction,
  card = true,
}: {
  scene: EmptyScene;
  tone?: EmptyTone;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** Wrap in a card surface (default) or render bare on the page. */
  card?: boolean;
}) {
  const body = (
    <div className="flex flex-col items-center text-center">
      <div className="ds-es-breathe ds-es-reveal">
        <EmptyIllustration scene={scene} tone={tone} />
      </div>
      <h3
        className="ds-es-reveal"
        style={{
          ...type_.headingSm,
          color: colors.textPrimary,
          marginTop: spacing[4],
          animationDelay: "0.06s",
        }}
      >
        {title}
      </h3>
      {description != null && (
        <p
          className="ds-es-reveal"
          style={{
            ...type_.body,
            color: colors.textSecondary,
            marginTop: spacing[1],
            maxWidth: 300,
            animationDelay: "0.12s",
          }}
        >
          {description}
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <div
          className="ds-es-reveal flex w-full flex-col items-center"
          style={{ gap: spacing[1], marginTop: spacing[5], animationDelay: "0.18s" }}
        >
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );

  if (!card) {
    return <div style={{ padding: `${spacing[7]}px ${spacing[4]}px` }}>{body}</div>;
  }
  return <Card padding={spacing[7]}>{body}</Card>;
}

/* ---------------------------------------------------------------- presets -- */
/** Supportive, forward-moving copy for every zero-data moment. `render`
 *  builds the full component; pass `onPrimary` / `onSecondary` to wire actions. */

export type EmptyPreset = {
  scene: EmptyScene;
  tone: EmptyTone;
  title: string;
  description: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

export const emptyStatePresets = {
  noMatches: {
    scene: "matches", tone: "pink",
    title: "Your match is warming up",
    description: "Complete your profile and a few standout photos make you far more likely to connect.",
    primaryLabel: "Complete profile", secondaryLabel: "Adjust preferences",
  },
  noMessages: {
    scene: "messages", tone: "primary",
    title: "Say the first hello",
    description: "Conversations start with curiosity. Break the ice with someone who shares your interests.",
    primaryLabel: "Find people", secondaryLabel: "See your likes",
  },
  noLikes: {
    scene: "likes", tone: "pink",
    title: "Likes are on the way",
    description: "Keep exploring — an active, complete profile gets noticed. Your next like could be a click away.",
    primaryLabel: "Start swiping",
  },
  noNotifications: {
    scene: "notifications", tone: "amber",
    title: "All caught up",
    description: "You're up to date. New matches, likes and messages will show up right here.",
    primaryLabel: "Explore campus",
  },
  noSearchResults: {
    scene: "search", tone: "slate",
    title: "No results for that",
    description: "Try a different name, interest or filter — sometimes a small change surfaces the right people.",
    primaryLabel: "Clear filters",
  },
  offline: {
    scene: "offline", tone: "slate",
    title: "You're offline",
    description: "We can't reach the network right now. Check your connection and we'll pick up right where you left off.",
    primaryLabel: "Try again",
  },
  permission: {
    scene: "permission", tone: "violet",
    title: "Permission needed",
    description: "Enable access so we can show nearby people and let you share photos. You're always in control.",
    primaryLabel: "Enable access", secondaryLabel: "Not now",
  },
  profileIncomplete: {
    scene: "profile", tone: "teal",
    title: "You're almost there",
    description: "Profiles with a bio and interests get up to 3× more matches. A few details go a long way.",
    primaryLabel: "Finish profile",
  },
  noPhotos: {
    scene: "photos", tone: "violet",
    title: "Add your first photo",
    description: "A clear, friendly photo helps people see the real you. You can add more anytime.",
    primaryLabel: "Add photos",
  },
  noCollege: {
    scene: "college", tone: "primary",
    title: "Choose your college",
    description: "Selecting your campus connects you with students nearby and unlocks the right community.",
    primaryLabel: "Select college",
  },
  noInterests: {
    scene: "interests", tone: "teal",
    title: "Pick a few interests",
    description: "Interests spark better conversations and smarter matches. Choose the ones that feel like you.",
    primaryLabel: "Add interests",
  },
  error: {
    scene: "error", tone: "amber",
    title: "Something went sideways",
    description: "That didn't load as expected. It's on us — give it another try in a moment.",
    primaryLabel: "Retry", secondaryLabel: "Go home",
  },
  deletedChat: {
    scene: "deleted", tone: "slate",
    title: "Conversation cleared",
    description: "This chat has been removed. When you're ready, start a fresh conversation anytime.",
    primaryLabel: "Back to messages",
  },
  blockedUser: {
    scene: "blocked", tone: "slate",
    title: "You blocked this person",
    description: "They can't view your profile or message you. You can undo this from settings whenever you like.",
    primaryLabel: "Manage blocked",
  },
  welcome: {
    scene: "welcome", tone: "pink",
    title: "Welcome to campus",
    description: "Let's set you up. Add a photo, pick your interests, and we'll introduce you to people you'll click with.",
    primaryLabel: "Get started", secondaryLabel: "Take a tour",
  },
} satisfies Record<string, EmptyPreset>;

export type EmptyPresetKey = keyof typeof emptyStatePresets;

/** Render a preset with wired actions in one call. */
export function EmptyStateFromPreset({
  preset,
  onPrimary,
  onSecondary,
  card = true,
}: {
  preset: EmptyPresetKey;
  onPrimary?: () => void;
  onSecondary?: () => void;
  card?: boolean;
}) {
  const p = emptyStatePresets[preset];
  return (
    <EmptyState
      scene={p.scene}
      tone={p.tone}
      title={p.title}
      description={p.description}
      card={card}
      primaryAction={
        p.primaryLabel ? (
          <Button variant="primary" fullWidth onClick={onPrimary}>
            {p.primaryLabel}
          </Button>
        ) : undefined
      }
      secondaryAction={
        p.secondaryLabel ? (
          <Button variant="ghost" fullWidth onClick={onSecondary}>
            {p.secondaryLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
