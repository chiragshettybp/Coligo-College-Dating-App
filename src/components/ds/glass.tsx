// ============================================================================
// Design System Components — reusable primitives
// ----------------------------------------------------------------------------
// Every future screen imports these. Do not re-style; compose.
// ============================================================================
import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  colors,
  gradients,
  motion,
  radii,
  shadows,
  surfaces,
} from "@/lib/ds";
import { cn } from "@/lib/utils";

const transition = `all ${motion.base} ${motion.easing}`;

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
      onClick={onClick}
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

const badgeTone: Record<BadgeTone, React.CSSProperties> = {
  primary: { background: "rgba(62,160,242,0.18)", color: colors.info, border: "rgba(62,160,242,0.4)" },
  success: { background: "rgba(67,217,163,0.16)", color: colors.success, border: "rgba(67,217,163,0.4)" },
  warning: { background: "rgba(245,181,68,0.16)", color: colors.warning, border: "rgba(245,181,68,0.4)" },
  danger: { background: "rgba(242,87,107,0.16)", color: colors.danger, border: "rgba(242,87,107,0.4)" },
  info: { background: "rgba(87,176,246,0.16)", color: colors.info, border: "rgba(87,176,246,0.4)" },
  neutral: { background: surfaces.glassSoft, color: colors.textSecondary, border: surfaces.border },
};

export function Badge({
  children,
  tone = "primary",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const t = badgeTone[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      style={{
        borderRadius: radii.pill,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        background: t.background,
        color: t.color as string,
        border: `1px solid ${t.border}`,
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Avatar */

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
const avatarSizes: Record<AvatarSize, number> = { xs: 28, sm: 40, md: 52, lg: 68, xl: 92 };
type AvatarStatus = "online" | "offline" | "away";
const statusColor: Record<AvatarStatus, string> = {
  online: colors.success,
  offline: "#6b7590",
  away: colors.warning,
};

export function Avatar({
  src,
  alt = "",
  size = "md",
  status,
  ring = false,
}: {
  src: string;
  alt?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  ring?: boolean;
}) {
  const px = avatarSizes[size];
  return (
    <div className="relative inline-block" style={{ width: px, height: px }}>
      <div
        className="h-full w-full overflow-hidden rounded-full"
        style={{
          border: ring ? "2px solid transparent" : `2px solid rgba(255,255,255,0.92)`,
          backgroundImage: ring
            ? `${gradients.pink} border-box`
            : undefined,
          padding: ring ? 2 : 0,
          boxShadow: shadows.soft,
        }}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      </div>
      {status && (
        <span
          className="absolute rounded-full"
          style={{
            right: 0,
            bottom: 0,
            width: px * 0.28,
            height: px * 0.28,
            background: statusColor[status],
            border: "2px solid #0c2270",
          }}
        />
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
      onClick={() => onChange(!checked)}
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
          transition: `width ${motion.slow} ${motion.easing}`,
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
