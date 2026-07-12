// ============================================================================
// Onboarding building blocks — compose the existing design system, no restyle.
// ============================================================================
import * as React from "react";

import { Text, Button, GlassPanel } from "@/components/ds/glass";
import { colors, spacing, radii, surfaces, gradients, shadows } from "@/lib/ds";

// -------------------------------------------------------------- OnboardingScreen
export function OnboardingScreen({
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  loading = false,
  error,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  loading?: boolean;
  error?: string | null;
  footer?: React.ReactNode;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!continueDisabled && !loading) onContinue();
      }}
      noValidate
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <div style={{ marginBottom: spacing[4] }}>
        <Text variant="displaySm" color={colors.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
            {subtitle}
          </Text>
        ) : null}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>

      {error ? (
        <Text variant="bodySm" role="alert" style={{ color: colors.danger, marginTop: spacing[3] }}>
          {error}
        </Text>
      ) : null}

      <div style={{ marginTop: spacing[5], display: "grid", gap: spacing[2] }}>
        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={continueDisabled || loading}>
          {continueLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}

// -------------------------------------------------------------- SelectableCard
export function SelectableCard({
  label,
  description,
  icon,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className="flex items-center w-full text-left active:scale-[0.99]"
      style={{
        gap: spacing[3],
        padding: spacing[3],
        borderRadius: radii.md,
        background: surfaces.glassSoft,
        border: `1.5px solid ${selected ? colors.primary : surfaces.border}`,
        boxShadow: selected ? shadows.primaryGlow : shadows.soft,
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 120ms ease",
        cursor: "pointer",
      }}
    >
      {icon ? (
        <span
          aria-hidden
          className="inline-flex items-center justify-center shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.sm,
            background: selected ? gradients.primaryButton : "rgba(10,132,255,0.08)",
            color: selected ? "#fff" : colors.primary,
          }}
        >
          {icon}
        </span>
      ) : null}
      <span style={{ flex: 1 }}>
        <Text variant="title" color={colors.textPrimary}>
          {label}
        </Text>
        {description ? (
          <Text variant="bodySm" tone="secondary" style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </span>
      <span
        aria-hidden
        className="inline-flex items-center justify-center shrink-0"
        style={{
          width: 22,
          height: 22,
          borderRadius: radii.pill,
          border: `2px solid ${selected ? colors.primary : surfaces.borderStrong}`,
          background: selected ? colors.primary : "transparent",
        }}
      >
        {selected ? (
          <span style={{ width: 8, height: 8, borderRadius: radii.pill, background: "#fff" }} />
        ) : null}
      </span>
    </button>
  );
}

// -------------------------------------------------------------- Selectable grid
export function SelectableGrid({ children }: { children: React.ReactNode }) {
  return <div role="radiogroup" style={{ display: "grid", gap: spacing[2] }}>{children}</div>;
}

// -------------------------------------------------------------- Compact tile
export function OptionTile({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className="active:scale-[0.97]"
      style={{
        padding: `${spacing[3]}px ${spacing[2]}px`,
        borderRadius: radii.md,
        background: selected ? gradients.primaryButton : surfaces.glassSoft,
        color: selected ? "#fff" : colors.textPrimary,
        border: `1.5px solid ${selected ? colors.primary : surfaces.border}`,
        boxShadow: selected ? shadows.primaryGlow : shadows.soft,
        fontWeight: 600,
        fontSize: 16,
        transition: "all 150ms ease",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// -------------------------------------------------------------- Info panel
export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <GlassPanel style={{ padding: spacing[3], marginTop: spacing[3] }}>
      <Text variant="bodySm" tone="secondary">
        {children}
      </Text>
    </GlassPanel>
  );
}
