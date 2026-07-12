// ============================================================================
// Design System Components — reusable primitives
// ----------------------------------------------------------------------------
// Every future screen imports these. Do not re-style; compose.
// ============================================================================
import * as React from "react";
import {
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  Building2,
  CalendarDays,
  Heart,
  Flame,
  Star,
  Users,
} from "lucide-react";

import {
  colors,
  gradients,
  motion,
  radii,
  shadows,
  surfaces,
  type as typeScale,
  type TypeToken,
} from "@/lib/ds";
import { cn } from "@/lib/utils";
import { haptic, type HapticToken } from "@/lib/haptics";

const transition = `all ${motion.base} ${motion.snappy}`;

/* -------------------------------------------------------------------- Text */

const TEXT_TAG: Record<TypeToken, keyof React.JSX.IntrinsicElements> = {
  displayXl: "h1",
  displayLg: "h1",
  displayMd: "h1",
  displaySm: "h2",
  headingXl: "h2",
  headingLg: "h2",
  headingMd: "h3",
  headingSm: "h4",
  title: "div",
  titleMd: "div",
  bodyLg: "p",
  body: "p",
  bodyMd: "p",
  bodySm: "p",
  caption: "span",
  overline: "span",
  label: "span",
  buttonLabel: "span",
  button: "span",
  inputText: "span",
  navLabel: "span",
  badgeLabel: "span",
  number: "span",
};

type TextTone = "primary" | "secondary" | "muted" | "inherit";
const textToneColor: Record<TextTone, string | undefined> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  inherit: undefined,
};

/**
 * The single text primitive. Every text role inherits a token from the type
 * scale — never hardcode a font size. Supports single-line truncation and
 * multi-line clamping so overflow behaviour is consistent everywhere.
 */
export function Text({
  variant = "body",
  tone = "primary",
  as,
  truncate = false,
  clamp,
  numeric = false,
  align,
  color,
  className,
  style,
  children,
  ...rest
}: {
  variant?: TypeToken;
  tone?: TextTone;
  as?: keyof React.JSX.IntrinsicElements;
  /** Single-line ellipsis truncation. */
  truncate?: boolean;
  /** Multi-line clamp to N lines with ellipsis. */
  clamp?: number;
  /** Force tabular figures (for aligned numbers). */
  numeric?: boolean;
  align?: React.CSSProperties["textAlign"];
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "color">) {
  const Tag = (as ?? TEXT_TAG[variant]) as React.ElementType;
  const token = typeScale[variant] as React.CSSProperties & {
    textTransform?: string;
    fontVariantNumeric?: string;
  };
  const clampStyle: React.CSSProperties = clamp
    ? {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: clamp,
        overflow: "hidden",
      }
    : {};
  const truncateStyle: React.CSSProperties = truncate
    ? { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
    : {};
  return (
    <Tag
      className={className}
      style={{
        margin: 0,
        color: color ?? textToneColor[tone],
        textAlign: align,
        ...token,
        ...(numeric ? { fontVariantNumeric: "tabular-nums" } : {}),
        ...truncateStyle,
        ...clampStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}


/* ---------------------------------------------------------------- GlassPanel */

export function GlassPanel({
  children,
  className,
  radius = radii.lg,
  soft = false,
  glow = false,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  radius?: number;
  soft?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={cn("relative backdrop-blur-2xl", className)}
      style={{
        borderRadius: radius,
        background: soft ? surfaces.glassSoft : surfaces.glass,
        border: `1px solid ${soft ? surfaces.borderSoft : surfaces.border}`,
        boxShadow: glow
          ? `${shadows.glass}, ${shadows.glow}`
          : shadows.glass,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------- Button */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "glass"
  | "success"
  | "danger";
type ButtonSize = "sm" | "md" | "lg";

const sizeMap: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 40, padding: "0 16px", fontSize: 14, borderRadius: radii.sm },
  md: { height: 50, padding: "0 22px", fontSize: 16, borderRadius: radii.md },
  lg: { height: 56, padding: "0 26px", fontSize: 17, borderRadius: radii.md },
};

/**
 * Light, tactile iOS-first buttons. Solid restrained surfaces, hairline
 * borders, dark text on light fills — never white-on-glass. Elevation is
 * subtle; the pressed state does the talking.
 */
function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: gradients.primaryButton,
        color: "#ffffff",
        border: "1px solid transparent",
        boxShadow: shadows.primaryGlow,
      };
    case "success":
      return {
        background: gradients.success,
        color: "#ffffff",
        border: "1px solid transparent",
        boxShadow: shadows.button,
      };
    case "danger":
      return {
        background: `linear-gradient(180deg, ${colors.danger} 0%, #e0301f 100%)`,
        color: "#ffffff",
        border: "1px solid transparent",
        boxShadow: shadows.button,
      };
    case "secondary":
      return {
        background: "rgba(120,120,128,0.12)",
        color: colors.textPrimary,
        border: `1px solid ${surfaces.borderSoft}`,
        boxShadow: "none",
      };
    case "outline":
      return {
        background: "transparent",
        color: colors.textPrimary,
        border: `1px solid ${surfaces.border}`,
        boxShadow: "none",
      };
    case "ghost":
      return {
        background: "transparent",
        color: colors.primary,
        border: "1px solid transparent",
        boxShadow: "none",
      };
    case "glass":
    default:
      return {
        background: surfaces.glassSoft,
        color: colors.textPrimary,
        border: `1px solid ${surfaces.border}`,
        boxShadow: shadows.soft,
      };
  }
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  pill = false,
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}) {
  const isDisabled = disabled || loading;
  // Semantic haptic per intent — never a generic "button was pressed" buzz.
  const variantHaptic: HapticToken =
    variant === "success"
      ? "softSuccess"
      : variant === "danger"
        ? "medium"
        : "selection";
  return (
    <button
      disabled={isDisabled}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 font-semibold will-change-transform",
        "outline-none transition-[transform,filter,box-shadow] duration-200 ease-out",
        "hover:brightness-[1.03] active:scale-[0.97] active:brightness-95",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--ds-focus,rgba(10,132,255,0.5))] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        isDisabled && "pointer-events-none opacity-40",
        className,
      )}
      style={{
        borderRadius: pill ? radii.pill : sizeMap[size].borderRadius,
        width: fullWidth ? "100%" : undefined,
        letterSpacing: "-0.01em",
        ...sizeMap[size],
        ...variantStyle(variant),
        ...(pill ? { borderRadius: radii.pill } : {}),
        ...style,
      }}
      onPointerDown={() => {
        if (!isDisabled) haptic(variantHaptic);
      }}
      {...rest}
    >
      {loading ? (
        <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

/* ---------------------------------------------------------------- IconButton */

export function IconButton({
  children,
  className,
  size = 48,
  primary = false,
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: number;
  primary?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full outline-none will-change-transform",
        "transition-[transform,filter] duration-200 ease-out hover:brightness-[1.04] active:scale-90",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--ds-focus,rgba(10,132,255,0.5))] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: primary ? gradients.primaryButton : surfaces.glassSoft,
        border: `1px solid ${primary ? "transparent" : surfaces.border}`,
        boxShadow: primary ? shadows.primaryGlow : shadows.soft,
        color: primary ? "#ffffff" : colors.textPrimary,
        ...style,
      }}
      onPointerDown={() => haptic("selection")}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- Fab */

/** Floating action button — anchored, high elevation, thumb-reachable. */
export function Fab({
  children,
  label,
  className,
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Optional text — turns the FAB into an extended pill. */
  label?: string;
}) {
  const extended = label != null;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold outline-none will-change-transform",
        "transition-[transform,filter] duration-200 ease-out hover:brightness-[1.04] hover:-translate-y-0.5 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--ds-focus,rgba(10,132,255,0.5))] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
      style={{
        height: 56,
        width: extended ? undefined : 56,
        padding: extended ? "0 22px 0 20px" : 0,
        borderRadius: radii.pill,
        background: gradients.primaryButton,
        color: "#ffffff",
        border: "1px solid transparent",
        boxShadow: `${shadows.large}, ${shadows.glow}`,
        fontSize: 16,
        letterSpacing: "-0.01em",
        ...style,
      }}
      onPointerDown={() => haptic("light")}
      {...rest}
    >
      {children}
      {label}
    </button>
  );
}


/* -------------------------------------------------------------------- Chip */

export function Chip({
  children,
  selected = false,
  onClick,
  className,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => {
        haptic("selection");
        onClick?.();
      }}

      className={cn(
        "inline-flex items-center gap-1.5 backdrop-blur-md will-change-transform",
        "hover:-translate-y-[1px] active:scale-95",
        className,
      )}
      style={{
        borderRadius: radii.pill,
        padding: "8px 16px",
        fontSize: 14,
        fontWeight: 600,
        transition,
        background: selected ? gradients.primaryButton : surfaces.glassSoft,
        color: selected ? "#fff" : colors.textSecondary,
        border: `1px solid ${selected ? surfaces.borderStrong : surfaces.border}`,
        boxShadow: selected ? shadows.primaryGlow : "none",
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- Badge */

type BadgeTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "accent";

type BadgeStyle = { background: string; color: string; border: string; dot: string };

// Calm iOS badge tones — a pale soft-tinted fill, hairline border and an
// accent-colored label. No glow, no glass gradient, no bright surfaces.
// One recipe across every tone so badges read as identity, not decoration.
const badgeTone: Record<BadgeTone, BadgeStyle> = {
  primary: {
    background: "rgba(10,132,255,0.10)",
    color: "#0060df",
    border: "rgba(10,132,255,0.16)",
    dot: "#0a84ff",
  },
  success: {
    background: "rgba(52,199,89,0.12)",
    color: "#248a3d",
    border: "rgba(52,199,89,0.18)",
    dot: "#34c759",
  },
  warning: {
    background: "rgba(255,159,10,0.12)",
    color: "#b25e00",
    border: "rgba(255,159,10,0.20)",
    dot: "#ff9f0a",
  },
  danger: {
    background: "rgba(255,59,48,0.10)",
    color: "#c01a12",
    border: "rgba(255,59,48,0.18)",
    dot: "#ff3b30",
  },
  info: {
    background: "rgba(10,132,255,0.10)",
    color: "#0060df",
    border: "rgba(10,132,255,0.16)",
    dot: "#0a84ff",
  },
  neutral: {
    background: "rgba(120,120,128,0.10)",
    color: "rgba(60,60,67,0.72)",
    border: "rgba(0,0,0,0.08)",
    dot: "rgba(60,60,67,0.5)",
  },
  accent: {
    background: "rgba(255,55,95,0.10)",
    color: "#d61f45",
    border: "rgba(255,55,95,0.16)",
    dot: "#ff375f",
  },
};

export function Badge({
  children,
  tone = "primary",
  dot = false,
  pulse = false,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  /** Show a leading status dot in the tone accent — color-independent cue. */
  dot?: boolean;
  /** Soft breathing pulse on the dot (e.g. "online", "typing"). */
  pulse?: boolean;
  className?: string;
}) {
  const t = badgeTone[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      style={{
        borderRadius: radii.pill,
        padding: dot ? "3px 10px 3px 8px" : "3px 10px",
        fontSize: 12,
        lineHeight: 1,
        fontWeight: 600,
        letterSpacing: "0.01em",
        fontVariantNumeric: "tabular-nums",
        background: t.background,
        color: t.color,
        border: `1px solid ${t.border}`,
      }}
    >
      {dot && (
        <span
          className={pulse ? "ds-badge-pulse" : undefined}
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: t.dot,
          }}
        />
      )}
      {children}
    </span>
  );
}

/* --------------------------------------------------------- Identity badges */

// One semantic system so every screen renders the same badge for the same
// meaning. Icons are sized/aligned once here; callers never restyle.
const IB_ICON = { width: 12, height: 12 } as const;

export type IdentityBadgeType =
  | "verified"
  | "premium"
  | "sameCollege"
  | "sameDepartment"
  | "sameSemester"
  | "new"
  | "popular"
  | "trending"
  | "mutualInterests";

const identityPresets: Record<
  IdentityBadgeType,
  { tone: BadgeTone; icon?: React.ReactNode; label: string }
> = {
  verified: { tone: "primary", icon: <ShieldCheck style={IB_ICON} />, label: "Verified" },
  premium: { tone: "accent", icon: <Sparkles style={IB_ICON} />, label: "Premium" },
  sameCollege: { tone: "primary", icon: <GraduationCap style={IB_ICON} />, label: "Same college" },
  sameDepartment: { tone: "primary", icon: <Building2 style={IB_ICON} />, label: "Same department" },
  sameSemester: { tone: "primary", icon: <CalendarDays style={IB_ICON} />, label: "Same semester" },
  new: { tone: "info", label: "New" },
  popular: { tone: "warning", icon: <Star style={IB_ICON} />, label: "Popular" },
  trending: { tone: "warning", icon: <Flame style={IB_ICON} />, label: "Trending" },
  mutualInterests: { tone: "primary", icon: <Users style={IB_ICON} />, label: "Mutual interests" },
};

/** Semantic identity badge — pass a type; label/icon/tone come from the system. */
export function IdentityBadge({
  type,
  label,
  className,
}: {
  type: IdentityBadgeType;
  /** Override the default label (e.g. "3 mutual interests"). */
  label?: string;
  className?: string;
}) {
  const preset = identityPresets[type];
  return (
    <Badge tone={preset.tone} className={className}>
      {preset.icon}
      {label ?? preset.label}
    </Badge>
  );
}

/** Online / offline presence — dot cue, no color reliance. */
export function PresenceBadge({
  online,
  className,
}: {
  online: boolean;
  className?: string;
}) {
  return (
    <Badge tone={online ? "success" : "neutral"} dot pulse={online} className={className}>
      {online ? "Online" : "Offline"}
    </Badge>
  );
}

/** Compatibility / match percentage — the one badge allowed a warmer accent. */
export function CompatibilityBadge({
  value,
  label = "match",
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  return (
    <Badge tone="accent" className={className}>
      <Heart style={IB_ICON} fill="currentColor" />
      {value}% {label}
    </Badge>
  );
}


/* ------------------------------------------------------------------ Avatar */

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
const avatarSizes: Record<AvatarSize, number> = {
  xs: 28,
  sm: 40,
  md: 52,
  lg: 68,
  xl: 92,
  hero: 124,
};
type AvatarStatus = "online" | "offline" | "away" | "busy";
const statusColor: Record<AvatarStatus, string> = {
  online: colors.success,
  offline: "#6b7590",
  away: colors.warning,
  busy: colors.danger,
};

/** Dark gap tone that matches the app background behind avatars. */
const AVATAR_GAP = "#0a1120";

/**
 * Signature luminous halo — a soft white conic sweep with one bright specular
 * arc that slowly travels around the ring, like light on polished glass.
 */
const HALO_SWEEP =
  "conic-gradient(from 0deg," +
  " rgba(255,255,255,0.16) 0deg," +
  " rgba(255,255,255,0.10) 70deg," +
  " rgba(255,255,255,0.95) 120deg," +
  " rgba(255,255,255,0.55) 150deg," +
  " rgba(255,255,255,0.12) 210deg," +
  " rgba(255,255,255,0.16) 360deg)";

export function Avatar({
  src,
  alt = "",
  size = "md",
  status,
  ring = false,
  verified = false,
  initials,
}: {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  ring?: boolean;
  verified?: boolean;
  initials?: string;
}) {
  const px = avatarSizes[size];
  const ringW = Math.max(2, Math.round(px * 0.05));
  const gapW = Math.max(1.5, Math.round(px * 0.028));
  const dot = Math.max(9, Math.round(px * 0.3));
  const cutout = Math.max(2, Math.round(px * 0.055));
  const badge = Math.max(14, Math.round(px * 0.34));

  // When both status + verified are present, status floats top-right.
  const statusTop = verified && !!status;

  const disc = (
    <div
      className="h-full w-full overflow-hidden rounded-full"
      style={{
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.16), inset 0 2px 3px rgba(255,255,255,0.22), inset 0 -3px 6px rgba(0,0,0,0.3)",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full font-bold text-white"
          style={{
            background: gradients.blueGloss,
            fontSize: px * 0.4,
            letterSpacing: "-0.02em",
          }}
        >
          {initials ?? "?"}
        </div>
      )}
    </div>
  );

  const glowBlur = Math.max(10, Math.round(px * 0.26));

  return (
    <div
      className={`relative inline-block ${ring ? "ds-halo" : ""}`}
      style={{ width: px, height: px }}
    >
      {ring && (
        <>
          {/* Layer 3 — soft outer white diffusion + separation from background. */}
          <div
            className="absolute rounded-full"
            style={{
              inset: 0,
              boxShadow: `0 0 ${glowBlur}px rgba(255,255,255,0.30), 0 0 ${glowBlur * 2}px rgba(255,255,255,0.12), 0 10px 22px rgba(0,0,0,0.45)`,
            }}
          />
          {/* Layer 2 + 4 — semi-transparent white ring with a slow moving specular arc. */}
          <div
            className="ds-halo-sweep absolute rounded-full"
            style={{ inset: 0, background: HALO_SWEEP }}
          />
          {/* Dark gap so the ring reads as light wrapping the avatar. */}
          <div
            className="absolute rounded-full"
            style={{ inset: ringW, background: AVATAR_GAP }}
          />
        </>
      )}

      {/* Disc — Layer 1 crisp white edge sits right against the photo. */}
      <div
        className="absolute rounded-full"
        style={{
          inset: ring ? ringW + gapW : 0,
          boxShadow: ring
            ? "0 0 0 1px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.35)"
            : shadows.soft,
        }}
      >
        {disc}
      </div>


      {status && (
        <span
          className="absolute rounded-full"
          style={{
            right: statusTop ? 0 : "6%",
            [statusTop ? "top" : "bottom"]: statusTop ? 0 : "6%",
            width: dot,
            height: dot,
            background: statusColor[status],
            border: `${cutout}px solid ${AVATAR_GAP}`,
            boxShadow:
              status === "online" ? `0 0 8px ${colors.success}` : "none",
          } as React.CSSProperties}
        />
      )}

      {verified && (
        <span
          className="absolute flex items-center justify-center rounded-full"
          style={{
            right: "-4%",
            bottom: "-4%",
            width: badge,
            height: badge,
            background: gradients.primaryButton,
            border: `${Math.max(1.5, cutout - 1)}px solid ${AVATAR_GAP}`,
            boxShadow: shadows.primaryGlow,
            color: "#fff",
          }}
        >
          <Check style={{ width: badge * 0.56, height: badge * 0.56 }} strokeWidth={3.2} />
        </span>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ Toggle */

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic("selection");
        onChange(!checked);
      }}
      className="relative shrink-0"
      style={{
        width: 52,
        height: 30,
        borderRadius: radii.pill,
        transition,
        background: checked ? gradients.primaryButton : surfaces.glassSoft,
        border: `1px solid ${checked ? surfaces.borderStrong : surfaces.border}`,
        boxShadow: checked ? shadows.primaryGlow : "inset 0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      <span
        className="absolute rounded-full bg-white"
        style={{
          top: 3,
          left: checked ? 25 : 3,
          width: 22,
          height: 22,
          transition,
          boxShadow: shadows.soft,
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------- Input */

export function TextField({
  label,
  error,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span
          className="mb-1.5 block"
          style={{ color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}
        >
          {label}
        </span>
      )}
      <input
        className="w-full text-white outline-none placeholder:text-white/40 focus:brightness-110"
        style={{
          borderRadius: radii.md,
          padding: "12px 16px",
          fontSize: 15,
          fontWeight: 500,
          transition,
          background: surfaces.glassSoft,
          border: `1px solid ${error ? colors.danger : surfaces.border}`,
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.25)",
        }}
        {...rest}
      />
      {error && (
        <span className="mt-1 block" style={{ color: colors.danger, fontSize: 13 }}>
          {error}
        </span>
      )}
    </label>
  );
}

/* --------------------------------------------------------------- Progress */

export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="w-full overflow-hidden"
      style={{
        height: 10,
        borderRadius: radii.pill,
        background: surfaces.glassSoft,
        border: `1px solid ${surfaces.borderSoft}`,
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          borderRadius: radii.pill,
          background: gradients.primaryButton,
          boxShadow: shadows.glow,
          transition: `width ${motion.slow} ${motion.snappy}`,
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- Skeleton */

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("ds-shimmer overflow-hidden", className)}
      style={{ borderRadius: radii.md, ...style }}
    />
  );
}
