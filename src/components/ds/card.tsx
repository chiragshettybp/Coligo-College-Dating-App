// ============================================================================
// Card System — the primary building block of the application
// ----------------------------------------------------------------------------
// One reusable, content-first card language. Every surface (profile, swipe,
// chat, settings, stats, alerts, empty states, info) composes from <Card> and
// its slots. Lightweight, calm, iOS-first. Never dashboard-like.
//   • Consistent radius + hairline borders + restrained elevation
//   • Generous internal spacing, clear typographic hierarchy
//   • CTA placement standardised via <CardFooter>
// Compose these — never re-style ad hoc.
// ============================================================================
import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, ChevronRight } from "lucide-react";

import { colors, radii, shadows, spacing, surfaces } from "@/lib/ds";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ds/glass";

/* -------------------------------------------------------------------- Card */

type CardVariant = "elevated" | "plain" | "outlined" | "inset";

const surfaceForVariant: Record<CardVariant, React.CSSProperties> = {
  // Default: floats gently above the background.
  elevated: {
    background: surfaces.glassSoft,
    border: `1px solid ${surfaces.borderSoft}`,
    boxShadow: shadows.soft,
  },
  // Flat, no shadow — for cards inside already-elevated surfaces.
  plain: {
    background: surfaces.glassSoft,
    border: `1px solid ${surfaces.borderSoft}`,
    boxShadow: "none",
  },
  // Structural emphasis via border only.
  outlined: {
    background: surfaces.glassSoft,
    border: `1px solid ${surfaces.border}`,
    boxShadow: "none",
  },
  // Recessed well — grouped rows, nested content.
  inset: {
    background: "rgba(120,120,128,0.06)",
    border: `1px solid ${surfaces.borderSoft}`,
    boxShadow: "none",
  },
};

export function Card({
  children,
  variant = "elevated",
  radius = radii.lg,
  padding = spacing[5],
  interactive = false,
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  radius?: number;
  /** Uniform inner padding. Pass 0 for edge-to-edge media / grouped rows. */
  padding?: number;
  /** Adds pressable affordance (hover lift + active press). */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        interactive &&
          "cursor-pointer transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
        className,
      )}
      style={{
        borderRadius: radius,
        padding,
        ...surfaceForVariant[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- Card slots */

export function CardHeader({
  title,
  subtitle,
  leading,
  trailing,
  className,
  style,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("flex items-center", className)}
      style={{ gap: spacing[2], ...style }}
    >
      {leading != null && <div className="flex-shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        {typeof title === "string" ? (
          <Text variant="title" truncate>
            {title}
          </Text>
        ) : (
          title
        )}
        {typeof subtitle === "string" ? (
          <Text variant="bodySm" tone="secondary" truncate>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </div>
      {trailing != null && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={{ marginTop: spacing[2], ...style }}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  align = "stretch",
  className,
  style,
}: {
  children: React.ReactNode;
  /** Standardised CTA placement. */
  align?: "start" | "end" | "between" | "stretch";
  className?: string;
  style?: React.CSSProperties;
}) {
  const justify =
    align === "start"
      ? "flex-start"
      : align === "end"
      ? "flex-end"
      : align === "between"
      ? "space-between"
      : "stretch";
  return (
    <div
      className={cn("flex items-center", className)}
      style={{
        gap: spacing[2],
        marginTop: spacing[4],
        justifyContent: justify,
        ...(align === "stretch" ? { flexDirection: "column", alignItems: "stretch" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Edge-to-edge media. Use inside a padding={0} Card, header/body below it. */
export function CardMedia({
  src,
  alt = "",
  ratio = 16 / 10,
  height,
  overlay,
  className,
  style,
}: {
  src: string;
  alt?: string;
  ratio?: number;
  height?: number;
  overlay?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        width: "100%",
        aspectRatio: height ? undefined : `${ratio}`,
        height,
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {overlay}
    </div>
  );
}

/** Hairline divider for grouped content. */
export function CardDivider({ inset = 0 }: { inset?: number }) {
  return (
    <div
      style={{
        height: 1,
        marginLeft: inset,
        background: surfaces.border,
      }}
    />
  );
}

/* -------------------------------------------------------------- Stat card */

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  icon,
  ...rest
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
} & Omit<React.ComponentProps<typeof Card>, "children">) {
  const deltaColor =
    deltaTone === "up" ? colors.success : deltaTone === "down" ? colors.danger : colors.textMuted;
  return (
    <Card {...rest}>
      <div className="flex items-start justify-between" style={{ gap: spacing[2] }}>
        <Text variant="overline" tone="muted">
          {label}
        </Text>
        {icon != null && <div style={{ color: colors.textMuted }}>{icon}</div>}
      </div>
      <div style={{ marginTop: spacing[2] }}>
        <Text variant="displaySm" numeric>
          {value}
        </Text>
      </div>
      {delta != null && (
        <Text variant="caption" style={{ marginTop: spacing[1], color: deltaColor }}>
          {delta}
        </Text>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------- Alert card */

type AlertTone = "info" | "success" | "warning" | "danger";

const alertConfig: Record<AlertTone, { color: string; tint: string; Icon: typeof Info }> = {
  info: { color: colors.info, tint: "rgba(10,132,255,0.10)", Icon: Info },
  success: { color: colors.success, tint: "rgba(52,199,89,0.12)", Icon: CheckCircle2 },
  warning: { color: colors.warning, tint: "rgba(255,159,10,0.12)", Icon: AlertTriangle },
  danger: { color: colors.danger, tint: "rgba(255,59,48,0.12)", Icon: XCircle },
};

export function AlertCard({
  tone = "info",
  title,
  message,
  action,
  ...rest
}: {
  tone?: AlertTone;
  title: string;
  message?: string;
  action?: React.ReactNode;
} & Omit<React.ComponentProps<typeof Card>, "children">) {
  const { color, tint, Icon } = alertConfig[tone];
  return (
    <Card variant="plain" {...rest}>
      <div className="flex" style={{ gap: spacing[3] }}>
        <div
          className="flex flex-shrink-0 items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: radii.md, background: tint, color }}
        >
          <Icon style={{ width: 20, height: 20 }} />
        </div>
        <div className="min-w-0 flex-1">
          <Text variant="title">{title}</Text>
          {message != null && (
            <Text variant="bodySm" tone="secondary" style={{ marginTop: spacing[0] }}>
              {message}
            </Text>
          )}
          {action != null && <div style={{ marginTop: spacing[3] }}>{action}</div>}
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------- Empty-state card */

export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  ...rest
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
} & Omit<React.ComponentProps<typeof Card>, "children">) {
  return (
    <Card padding={spacing[7]} {...rest}>
      <div className="flex flex-col items-center text-center">
        {icon != null && (
          <div
            className="flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.lg,
              background: "rgba(120,120,128,0.08)",
              color: colors.textMuted,
              marginBottom: spacing[3],
            }}
          >
            {icon}
          </div>
        )}
        <Text variant="headingSm" align="center">
          {title}
        </Text>
        {description != null && (
          <Text
            variant="body"
            tone="secondary"
            align="center"
            style={{ marginTop: spacing[1], maxWidth: 300 }}
          >
            {description}
          </Text>
        )}
        {action != null && <div style={{ marginTop: spacing[4] }}>{action}</div>}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------- Info card */

export function InfoCard({
  icon,
  title,
  children,
  ...rest
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<typeof Card>, "children" | "title">) {
  return (
    <Card {...rest}>
      <CardHeader
        title={title}
        leading={
          icon != null ? (
            <div
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: radii.md,
                background: "rgba(10,132,255,0.10)",
                color: colors.primary,
              }}
            >
              {icon}
            </div>
          ) : undefined
        }
      />
      {children != null && (
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>
          {children}
        </Text>
      )}
    </Card>
  );
}

/* --------------------------------------------------- Settings card + rows */

/** Grouped list container — hairline-separated rows, edge-to-edge. */
export function SettingsCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const items = React.Children.toArray(children);
  return (
    <Card padding={0} className={className} style={style}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <CardDivider inset={spacing[4]} />}
          {child}
        </React.Fragment>
      ))}
    </Card>
  );
}

export function SettingsRow({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  chevron,
}: {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const clickable = onClick != null;
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center",
        clickable && "cursor-pointer transition-colors duration-150 active:bg-black/[0.03]",
      )}
      style={{
        gap: spacing[3],
        padding: `${spacing[3]}px ${spacing[4]}px`,
        minHeight: 56,
      }}
    >
      {leading != null && <div className="flex-shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <Text variant="label" truncate>
          {title}
        </Text>
        {subtitle != null && (
          <Text variant="bodySm" tone="secondary" truncate>
            {subtitle}
          </Text>
        )}
      </div>
      {trailing != null && <div className="flex-shrink-0">{trailing}</div>}
      {(chevron ?? clickable) && (
        <ChevronRight style={{ width: 18, height: 18, color: colors.textMuted, flexShrink: 0 }} />
      )}
    </div>
  );
}
