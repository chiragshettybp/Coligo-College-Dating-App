// ============================================================================
// Settings Control System — one reusable, Apple-grade settings language.
// ----------------------------------------------------------------------------
// Grouped cards, hairline separators, large touch areas, leading icon tiles,
// trailing chevrons, and a full family of tactile controls (switch, segmented,
// radio, checkbox, dropdown, slider, collapsible group, danger zone). Every
// value inherits from the design tokens in "@/lib/ds"; nothing is hardcoded.
// ============================================================================

import { useState, type ReactNode } from "react";
import { ChevronRight, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import {
  colors,
  radii,
  shadows,
  spacing,
  surfaces,
  type as type_,
  weights,
  motion,
} from "@/lib/ds";

const SPRING = motion.type ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease-out";

/* -------------------------------------------------------------------- Switch -- */
/** iOS-style switch: gray inactive track, spring thumb, premium shadows. */

export function Switch({
  checked,
  onChange,
  tone = "primary",
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  tone?: "primary" | "success";
  disabled?: boolean;
}) {
  const activeBg = tone === "success" ? colors.success : colors.primary;
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        haptic("selection");
        onChange(!checked);
      }}
      className="relative shrink-0"
      style={{
        width: 51,
        height: 31,
        borderRadius: radii.pill,
        background: checked ? activeBg : "rgba(120,120,128,0.18)",
        boxShadow: checked
          ? `inset 0 0 0 1px rgba(0,0,0,0.04)`
          : `inset 0 0 0 1px ${surfaces.borderSoft}`,
        transition: `background 260ms ${motion.snappy}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        className="absolute rounded-full bg-white"
        style={{
          top: 2,
          left: checked ? 22 : 2,
          width: 27,
          height: 27,
          boxShadow: "0 1px 1px rgba(0,0,0,0.04), 0 3px 8px rgba(0,0,0,0.15)",
          transition: `left 300ms ${SPRING}`,
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------- SettingsGroup -- */

export function SettingsGroup({
  label,
  footnote,
  children,
}: {
  label?: string;
  footnote?: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section>
      {label ? (
        <div
          style={{
            ...type_.overline,
            color: colors.textMuted,
            padding: `0 ${spacing[3]}px`,
            marginBottom: spacing[1],
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          borderRadius: radii.lg,
          background: surfaces.glassSoft,
          border: `1px solid ${surfaces.borderSoft}`,
          boxShadow: shadows.soft,
          overflow: "hidden",
        }}
      >
        {items.filter(Boolean).map((child, i) => (
          <div key={i}>
            {i > 0 && (
              <div
                aria-hidden
                style={{
                  height: 1,
                  background: surfaces.borderSoft,
                  marginLeft: 56,
                }}
              />
            )}
            {child}
          </div>
        ))}
      </div>
      {footnote ? (
        <p
          style={{
            ...type_.caption,
            color: colors.textMuted,
            padding: `0 ${spacing[3]}px`,
            marginTop: spacing[1],
          }}
        >
          {footnote}
        </p>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------- SettingsItem -- */

export function SettingsItem({
  icon,
  iconTint = colors.primary,
  title,
  subtitle,
  value,
  trailing,
  chevron,
  onClick,
  danger,
}: {
  icon?: ReactNode;
  iconTint?: string;
  title: string;
  subtitle?: string;
  value?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  danger?: boolean;
}) {
  const clickable = onClick != null;
  const showChevron = chevron ?? clickable;
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={
        clickable
          ? () => {
              haptic("light");
              onClick();
            }
          : undefined
      }
      className={cn("flex items-center", clickable && "ds-press cursor-pointer")}
      style={{
        gap: spacing[2],
        padding: `${spacing[2]}px ${spacing[3]}px`,
        minHeight: 52,
        transition: `background 140ms ${motion.snappy}`,
      }}
    >
      {icon != null && (
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: danger ? "rgba(255,59,48,0.10)" : `${iconTint}1a`,
            color: danger ? colors.danger : iconTint,
          }}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div
          className="truncate"
          style={{
            ...type_.label,
            fontWeight: weights.medium,
            color: danger ? colors.danger : colors.textPrimary,
          }}
        >
          {title}
        </div>
        {subtitle != null && (
          <div className="truncate" style={{ ...type_.caption, color: colors.textMuted }}>
            {subtitle}
          </div>
        )}
      </div>
      {value != null && (
        <span className="shrink-0" style={{ ...type_.body, color: colors.textMuted }}>
          {value}
        </span>
      )}
      {trailing != null && <div className="shrink-0">{trailing}</div>}
      {showChevron && (
        <ChevronRight style={{ width: 18, height: 18, color: colors.textMuted, flexShrink: 0 }} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- RadioRow -- */

export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; subtitle?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <>
      {options.map((opt, i) => (
        <div key={opt.value}>
          {i > 0 && <div aria-hidden style={{ height: 1, background: surfaces.borderSoft, marginLeft: spacing[3] }} />}
          <button
            onClick={() => {
              haptic("selection");
              onChange(opt.value);
            }}
            className="ds-press flex w-full items-center text-left"
            style={{ gap: spacing[2], padding: `${spacing[2]}px ${spacing[3]}px`, minHeight: 52 }}
          >
            <div className="min-w-0 flex-1">
              <div style={{ ...type_.label, fontWeight: weights.medium, color: colors.textPrimary }}>
                {opt.label}
              </div>
              {opt.subtitle && (
                <div style={{ ...type_.caption, color: colors.textMuted }}>{opt.subtitle}</div>
              )}
            </div>
            {value === opt.value && (
              <Check style={{ width: 20, height: 20, color: colors.primary }} strokeWidth={2.6} />
            )}
          </button>
        </div>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- Checkbox -- */

export function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => {
        haptic("selection");
        onChange(!checked);
      }}
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 24,
        height: 24,
        borderRadius: 8,
        background: checked ? colors.primary : "transparent",
        border: `1.5px solid ${checked ? colors.primary : surfaces.borderStrong}`,
        transition: `all 180ms ${SPRING}`,
      }}
    >
      {checked && <Check style={{ width: 15, height: 15, color: "#fff" }} strokeWidth={3} />}
    </button>
  );
}

/* ---------------------------------------------------------------- Dropdown -- */

export function Dropdown<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={(e) => {
          haptic("light");
          onChange(e.target.value as T);
        }}
        className="appearance-none"
        style={{
          ...type_.body,
          color: colors.textMuted,
          background: "transparent",
          border: "none",
          outline: "none",
          paddingRight: 20,
          textAlign: "right",
          cursor: "pointer",
          direction: "rtl",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ direction: "ltr" }}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        style={{ width: 16, height: 16, color: colors.textMuted, position: "absolute", right: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Slider -- */

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  tint = colors.primary,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  tint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="ds-slider w-full"
      style={
        {
          "--ds-slider-pct": `${pct}%`,
          "--ds-slider-tint": tint,
        } as React.CSSProperties
      }
    />
  );
}

/* --------------------------------------------------------- CollapsibleGroup -- */

export function CollapsibleGroup({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        borderRadius: radii.lg,
        background: surfaces.glassSoft,
        border: `1px solid ${surfaces.borderSoft}`,
        boxShadow: shadows.soft,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => {
          haptic("light");
          setOpen((o) => !o);
        }}
        className="ds-press flex w-full items-center justify-between"
        style={{ padding: `${spacing[2]}px ${spacing[3]}px`, minHeight: 52 }}
      >
        <span style={{ ...type_.label, fontWeight: weights.semibold, color: colors.textPrimary }}>
          {label}
        </span>
        <ChevronDown
          style={{
            width: 18,
            height: 18,
            color: colors.textMuted,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform 240ms ${motion.snappy}`,
          }}
        />
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: `grid-template-rows 300ms ${motion.snappy}`,
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div aria-hidden style={{ height: 1, background: surfaces.borderSoft }} />
          {children}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- DangerZone -- */

export function DangerZone({
  label = "Danger Zone",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section>
      <div
        style={{
          ...type_.overline,
          color: "rgba(255,59,48,0.7)",
          padding: `0 ${spacing[3]}px`,
          marginBottom: spacing[1],
        }}
      >
        {label}
      </div>
      <div
        style={{
          borderRadius: radii.lg,
          background: "rgba(255,59,48,0.04)",
          border: "1px solid rgba(255,59,48,0.14)",
          overflow: "hidden",
        }}
      >
        {items.filter(Boolean).map((child, i) => (
          <div key={i}>
            {i > 0 && (
              <div aria-hidden style={{ height: 1, background: "rgba(255,59,48,0.12)", marginLeft: 56 }} />
            )}
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}
