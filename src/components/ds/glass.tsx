// ============================================================================
// Design System Components — reusable primitives
// ----------------------------------------------------------------------------
// Every future screen imports these. Do not re-style; compose.
// ============================================================================
import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import {
  colors,
  gradients,
  motion,
  radii,
  shadows,
  surfaces,
} from "@/lib/ds";
import { cn } from "@/lib/utils";
import { haptic, type HapticToken } from "@/lib/haptics";

const transition = `all ${motion.base} ${motion.snappy}`;

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
  sm: { height: 38, padding: "0 16px", fontSize: 14 },
  md: { height: 48, padding: "0 22px", fontSize: 16 },
  lg: { height: 58, padding: "0 28px", fontSize: 18 },
};

function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: gradients.primaryButton,
        color: "#fff",
        border: `1px solid ${surfaces.borderStrong}`,
        boxShadow: shadows.primaryGlow,
      };
    case "success":
      return {
        background:
          "linear-gradient(160deg, rgba(67,217,163,0.92), rgba(31,174,126,0.92))",
        color: "#fff",
        border: `1px solid ${surfaces.borderStrong}`,
        boxShadow: shadows.button,
      };
    case "danger":
      return {
        background:
          "linear-gradient(160deg, rgba(242,87,107,0.92), rgba(200,50,70,0.92))",
        color: "#fff",
        border: `1px solid ${surfaces.borderStrong}`,
        boxShadow: shadows.button,
      };
    case "secondary":
      return {
        background: surfaces.glassSoft,
        color: "#fff",
        border: `1px solid ${surfaces.border}`,
        boxShadow: shadows.button,
      };
    case "outline":
      return {
        background: "transparent",
        color: "#e7ecff",
        border: `1px solid ${surfaces.borderStrong}`,
      };
    case "ghost":
      return {
        background: "transparent",
        color: "#e7ecff",
        border: "1px solid transparent",
      };
    case "glass":
    default:
      return {
        background: gradients.glassButton,
        color: "#e7ecff",
        border: `1px solid ${surfaces.border}`,
        boxShadow: shadows.button,
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
        "inline-flex items-center justify-center gap-2 font-semibold backdrop-blur-xl will-change-transform",
        "hover:-translate-y-[1px] hover:brightness-110 active:scale-[0.97]",
        isDisabled && "pointer-events-none opacity-50",
        className,
      )}
      style={{
        borderRadius: pill ? radii.pill : radii.md,
        width: fullWidth ? "100%" : undefined,
        transition,
        ...sizeMap[size],
        ...variantStyle(variant),
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
        "flex shrink-0 items-center justify-center rounded-full backdrop-blur-xl will-change-transform",
        "hover:-translate-y-[2px] hover:brightness-110 active:scale-95",
        className,
      )}
      style={{
        width: size,
        height: size,
        transition,
        background: primary ? gradients.primaryButton : gradients.glassButton,
        border: `1px solid ${primary ? surfaces.borderStrong : surfaces.border}`,
        boxShadow: primary ? shadows.primaryGlow : shadows.button,
        color: "#e7ecff",
        ...style,
      }}
      onPointerDown={() => haptic("selection")}
      {...rest}

    >
      {children}
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

type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

type BadgeStyle = { background: string; color: string; border: string; dot: string };

// Layered glass tints — a soft top-lit gradient, hairline border and a
// restrained accent. Calm, collectible, same recipe across every tone.
const badgeTone: Record<BadgeTone, BadgeStyle> = {
  primary: {
    background: "linear-gradient(165deg, rgba(62,160,242,0.20), rgba(62,160,242,0.07))",
    color: "#aed6ff",
    border: "rgba(62,160,242,0.30)",
    dot: colors.primary,
  },
  success: {
    background: "linear-gradient(165deg, rgba(67,217,163,0.18), rgba(67,217,163,0.06))",
    color: "#8ff0cf",
    border: "rgba(67,217,163,0.30)",
    dot: colors.success,
  },
  warning: {
    background: "linear-gradient(165deg, rgba(245,181,68,0.18), rgba(245,181,68,0.06))",
    color: "#ffd894",
    border: "rgba(245,181,68,0.30)",
    dot: colors.warning,
  },
  danger: {
    background: "linear-gradient(165deg, rgba(242,87,107,0.18), rgba(242,87,107,0.06))",
    color: "#ffaab5",
    border: "rgba(242,87,107,0.30)",
    dot: colors.danger,
  },
  info: {
    background: "linear-gradient(165deg, rgba(87,176,246,0.18), rgba(87,176,246,0.06))",
    color: "#b6ddff",
    border: "rgba(87,176,246,0.30)",
    dot: colors.info,
  },
  neutral: {
    background: "linear-gradient(165deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))",
    color: colors.textSecondary,
    border: surfaces.border,
    dot: "#8ea3d6",
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
      className={cn("inline-flex items-center gap-1.5 backdrop-blur-md", className)}
      style={{
        borderRadius: radii.pill,
        padding: dot ? "4px 11px 4px 9px" : "4px 11px",
        fontSize: 12,
        lineHeight: 1,
        fontWeight: 600,
        letterSpacing: "0.01em",
        fontVariantNumeric: "tabular-nums",
        background: t.background,
        color: t.color,
        border: `1px solid ${t.border}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(0,0,0,0.25)",
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
            boxShadow: `0 0 8px ${t.dot}`,
          }}
        />
      )}
      {children}
    </span>
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
