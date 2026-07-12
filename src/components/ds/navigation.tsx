// ============================================================================
// Navigation System — one reusable surface for every screen.
// ----------------------------------------------------------------------------
// Light, calm, iOS-first. Floating premium chrome, safe-area aware, hairline
// borders, spring press feedback. Nothing here hardcodes color or size — every
// value inherits from the design tokens in "@/lib/ds". Import from here; never
// rebuild navigation inline.
// ============================================================================

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import {
  colors,
  radii,
  shadows,
  spacing,
  surfaces,
  gradients,
  type as type_,
  weights,
  motion,
} from "@/lib/ds";

const EASE = motion.snappy;
const T_FAST = `${motion.fast} ${EASE}`;
const T_BASE = `${motion.base} ${EASE}`;

/* --------------------------------------------------------------- NavBadge -- */

export function NavBadge({ count }: { count: number }) {
  return (
    <span
      className="ds-react-pop flex items-center justify-center rounded-full"
      style={{
        position: "absolute",
        top: -3,
        right: -3,
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        background: colors.accent,
        color: "#fff",
        fontSize: 10,
        fontWeight: weights.bold,
        lineHeight: 1,
        border: "2px solid #ffffff",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/* ----------------------------------------------------------- NavIconButton -- */

export function NavIconButton({
  children,
  label,
  badge,
  onClick,
}: {
  children: ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={() => {
        haptic("light");
        onClick?.();
      }}
      className="ds-press flex items-center justify-center rounded-full"
      style={{
        position: "relative",
        width: 40,
        height: 40,
        color: colors.textPrimary,
        background: "transparent",
        transition: `background ${T_FAST}`,
      }}
    >
      {children}
      {badge ? <NavBadge count={badge} /> : null}
    </button>
  );
}

/* ------------------------------------------------------------------ TopBar -- */
/** Compact glass top bar: back · centered title · trailing action. */

export function TopBar({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        justifyContent: "space-between",
        gap: spacing[2],
        padding: `${spacing[1]}px ${spacing[2]}px`,
        borderRadius: radii.lg,
        background: surfaces.glass,
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: `1px solid ${surfaces.borderSoft}`,
        boxShadow: shadows.soft,
      }}
    >
      <div style={{ width: 40 }}>
        {onBack ? (
          <NavIconButton label="Back" onClick={onBack}>
            <BackChevron />
          </NavIconButton>
        ) : null}
      </div>
      <span
        className="truncate"
        style={{ ...type_.title, color: colors.textPrimary }}
      >
        {title}
      </span>
      <div className="flex justify-end" style={{ width: 40 }}>
        {trailing}
      </div>
    </div>
  );
}

function BackChevron() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------- LargeTitleHeader -- */
/** Large title that collapses to a compact inline title as content scrolls.
 *  `collapsed` can be driven by a scroll listener; defaults to expanded. */

export function LargeTitleHeader({
  eyebrow,
  title,
  actions,
  collapsed = false,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  collapsed?: boolean;
}) {
  return (
    <div
      style={{
        padding: `${spacing[2]}px ${spacing[3]}px`,
        borderRadius: radii.lg,
        background: surfaces.glass,
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: `1px solid ${surfaces.borderSoft}`,
        boxShadow: shadows.soft,
        transition: `padding ${T_BASE}`,
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
        <span
          className="truncate"
          style={{
            ...type_.title,
            color: colors.textPrimary,
            opacity: collapsed ? 1 : 0,
            transform: collapsed ? "translateY(0)" : "translateY(4px)",
            transition: `opacity ${T_FAST}, transform ${T_FAST}`,
          }}
        >
          {title}
        </span>
        <div className="flex shrink-0 items-center" style={{ gap: spacing[0] }}>
          {actions}
        </div>
      </div>

      <div
        style={{
          overflow: "hidden",
          maxHeight: collapsed ? 0 : 80,
          opacity: collapsed ? 0 : 1,
          marginTop: collapsed ? 0 : spacing[1],
          transition: `max-height ${T_BASE}, opacity ${T_FAST}, margin-top ${T_BASE}`,
        }}
      >
        {eyebrow ? (
          <div style={{ ...type_.caption, color: colors.primary }}>{eyebrow}</div>
        ) : null}
        <h2 style={{ ...type_.displaySm, color: colors.textPrimary, marginTop: 2 }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- SegmentControl -- */

export function SegmentControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Segmented control"
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        padding: 3,
        borderRadius: radii.md,
        background: "rgba(120,120,128,0.12)",
        border: `1px solid ${surfaces.borderSoft}`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 3,
          bottom: 3,
          left: `calc(${(value * 100) / options.length}% + 3px)`,
          width: `calc(${100 / options.length}% - 6px)`,
          borderRadius: radii.sm,
          background: surfaces.glassSoft,
          boxShadow: shadows.soft,
          transition: `left ${T_BASE}`,
        }}
      />
      {options.map((opt, i) => (
        <button
          key={opt}
          role="tab"
          aria-selected={value === i}
          onClick={() => {
            haptic("light");
            onChange(i);
          }}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "8px 4px",
            ...type_.label,
            fontSize: 13,
            color: value === i ? colors.textPrimary : colors.textSecondary,
            transition: `color ${T_FAST}`,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- ScrollTabs -- */

export function ScrollTabs({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Scrollable tabs"
      className="flex items-center gap-3 overflow-x-auto"
      style={{ scrollbarWidth: "none", margin: "0 -2px", padding: "2px" }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            onClick={() => {
              haptic("light");
              onChange(opt);
            }}
            className="ds-press shrink-0"
            style={{
              position: "relative",
              padding: "8px 2px",
              ...type_.label,
              fontSize: 15,
              color: active ? colors.textPrimary : colors.textMuted,
              transition: `color ${T_FAST}`,
            }}
          >
            {opt}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 2,
                right: 2,
                bottom: 0,
                height: 2.5,
                borderRadius: 3,
                background: active ? colors.primary : "transparent",
                transition: `background ${T_FAST}`,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ BottomNav -- */
/** Floating premium tab bar. Safe-area aware, active pill expands with label. */

export type BottomNavItem = {
  icon: (props: { style?: React.CSSProperties; strokeWidth?: number }) => ReactNode;
  label: string;
  badge?: number;
};

export function BottomNav({
  items,
  active,
  onChange,
  floating = true,
}: {
  items: BottomNavItem[];
  active: number;
  onChange: (i: number) => void;
  floating?: boolean;
}) {
  return (
    <nav
      aria-label="Primary"
      className="flex items-center"
      style={{
        justifyContent: "space-between",
        gap: spacing[0],
        padding: 7,
        borderRadius: radii.xl,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        border: `1px solid ${surfaces.borderSoft}`,
        boxShadow: floating ? shadows.large : shadows.soft,
        marginBottom: floating ? "env(safe-area-inset-bottom, 0px)" : undefined,
      }}
    >
      {items.map((item, i) => {
        const isActive = active === i;
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              haptic("light");
              onChange(i);
            }}
            className="ds-press flex items-center justify-center"
            style={{
              position: "relative",
              gap: 8,
              height: 46,
              flex: isActive ? "1 1 auto" : "0 0 auto",
              minWidth: 46,
              padding: isActive ? "0 18px" : "0 12px",
              borderRadius: radii.pill,
              color: isActive ? "#fff" : colors.textMuted,
              background: isActive ? gradients.primaryButton : "transparent",
              boxShadow: isActive ? shadows.primaryGlow : "none",
              // Snappy spring so the active pill and label feel instant and tactile.
              transition:
                "flex 260ms cubic-bezier(0.34,1.56,0.64,1), background 160ms ease-out, color 120ms ease-out, padding 260ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Icon
                style={{
                  width: 22,
                  height: 22,
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  transition: "transform 220ms cubic-bezier(0.34,1.56,0.64,1)",
                }}
                strokeWidth={isActive ? 2.4 : 2}
              />
              {item.badge && !isActive ? <NavBadge count={item.badge} /> : null}
            </span>
            {isActive && (
              <span style={{ ...type_.navLabel, fontSize: 14, whiteSpace: "nowrap" }}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* --------------------------------------------------------------------- Fab -- */

export function NavFab({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={() => {
        haptic("medium");
        onClick?.();
      }}
      className="ds-press flex items-center justify-center rounded-full"
      style={{
        width: 56,
        height: 56,
        color: "#fff",
        background: gradients.primaryButton,
        boxShadow: shadows.primaryGlow,
        border: "1px solid rgba(255,255,255,0.25)",
      }}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------- BottomSheet -- */
/** Drag-to-dismiss bottom sheet with backdrop scrim. Follows the finger. */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current == null) return;
    const dy = e.clientY - startY.current;
    setDrag(dy > 0 ? dy : dy * 0.25); // resistance when dragging up
  };
  const onPointerUp = () => {
    if (drag > 90) {
      haptic("light");
      onClose();
    }
    setDrag(0);
    startY.current = null;
  };

  return (
    <div
      aria-hidden={!open}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "flex-end",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <div
        onClick={() => {
          haptic("light");
          onClose();
        }}
        style={{
          position: "absolute",
          inset: 0,
          background: surfaces.overlay,
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          transition: `opacity ${T_BASE}`,
        }}
      />
      <div
        role="dialog"
        aria-label={title ?? "Sheet"}
        onTransitionEnd={() => {
          if (!open) setMounted(false);
        }}
        style={{
          position: "relative",
          width: "100%",
          maxHeight: "80%",
          overflowY: "auto",
          padding: `${spacing[2]}px ${spacing[4]}px ${spacing[5]}px`,
          borderRadius: `${radii.xl}px ${radii.xl}px 0 0`,
          background: surfaces.glassSoft,
          border: `1px solid ${surfaces.borderSoft}`,
          boxShadow: shadows.large,
          transform: open
            ? `translateY(${Math.max(drag, 0)}px)`
            : "translateY(100%)",
          transition:
            startY.current == null ? `transform ${T_BASE}` : "none",
          touchAction: "none",
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ cursor: "grab", paddingBottom: spacing[2] }}
        >
          <div
            aria-hidden
            style={{
              width: 38,
              height: 5,
              borderRadius: radii.pill,
              background: surfaces.borderStrong,
              margin: "0 auto",
            }}
          />
          {title ? (
            <h3
              style={{
                ...type_.headingSm,
                color: colors.textPrimary,
                textAlign: "center",
                marginTop: spacing[2],
              }}
            >
              {title}
            </h3>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- ActionSheet -- */

export type ActionSheetAction = {
  label: string;
  onSelect?: () => void;
  destructive?: boolean;
};

export function ActionSheet({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: ActionSheetAction[];
}) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col" style={{ gap: spacing[1] }}>
        <div
          style={{
            borderRadius: radii.md,
            overflow: "hidden",
            background: surfaces.glass,
            border: `1px solid ${surfaces.borderSoft}`,
          }}
        >
          {actions.map((a, i) => (
            <button
              key={a.label}
              onClick={() => {
                haptic("light");
                a.onSelect?.();
                onClose();
              }}
              className="ds-press w-full text-center"
              style={{
                padding: `${spacing[2]}px`,
                ...type_.title,
                color: a.destructive ? colors.danger : colors.primary,
                borderTop: i === 0 ? "none" : `1px solid ${surfaces.borderSoft}`,
                background: "transparent",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            haptic("light");
            onClose();
          }}
          className="ds-press w-full text-center"
          style={{
            padding: `${spacing[2]}px`,
            ...type_.title,
            fontWeight: weights.semibold,
            color: colors.textPrimary,
            borderRadius: radii.md,
            background: surfaces.glassSoft,
            border: `1px solid ${surfaces.borderSoft}`,
            boxShadow: shadows.soft,
          }}
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------- SearchBar -- */

export function SearchBar({
  value,
  onChange,
  placeholder = "Search",
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: ReactNode;
}) {
  return (
    <label
      className={cn("flex items-center")}
      style={{
        gap: spacing[1],
        padding: `${spacing[1]}px ${spacing[2]}px`,
        borderRadius: radii.md,
        background: "rgba(120,120,128,0.10)",
        border: `1px solid ${surfaces.borderSoft}`,
      }}
    >
      <span style={{ color: colors.textMuted, display: "flex" }}>{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          ...type_.inputText,
          color: colors.textPrimary,
        }}
      />
    </label>
  );
}
