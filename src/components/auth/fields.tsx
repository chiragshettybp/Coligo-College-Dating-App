// ============================================================================
// Auth form field primitives — light-theme inputs built on design tokens.
// Kept separate from the dark-surface DS <TextField> so the auth screens read
// correctly on the light app background while sharing the same visual language.
// ============================================================================
import { useRef, useState, useId } from "react";
import { Eye, EyeOff, Check } from "lucide-react";

import { colors, radii, surfaces, spacing } from "@/lib/ds";
import { PASSWORD_RULES, passwordStrength } from "@/lib/auth";

const baseInput: React.CSSProperties = {
  width: "100%",
  borderRadius: radii.md,
  padding: "13px 16px",
  fontSize: 16, // >=16 prevents iOS zoom-on-focus
  fontWeight: 500,
  color: colors.textPrimary,
  background: surfaces.glassSoft,
  border: `1px solid ${surfaces.border}`,
  outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}
    >
      {children}
    </label>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <span id={id} role="alert" style={{ display: "block", marginTop: 6, color: colors.danger, fontSize: 13, fontWeight: 500 }}>
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ PhoneField
export function PhoneField({
  value,
  onChange,
  error,
  label = "Mobile number",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div
        className="flex items-center"
        style={{
          borderRadius: radii.md,
          background: surfaces.glassSoft,
          border: `1px solid ${error ? colors.danger : focused ? colors.primary : surfaces.border}`,
          boxShadow: focused ? "0 0 0 3px rgba(10,132,255,0.15)" : "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        }}
      >
        <span
          aria-hidden
          style={{
            padding: "13px 12px 13px 16px",
            fontSize: 16,
            fontWeight: 600,
            color: colors.textSecondary,
            borderRight: `1px solid ${surfaces.border}`,
          }}
        >
          +91
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="98765 43210"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "13px 16px",
            fontSize: 16,
            fontWeight: 500,
            color: colors.textPrimary,
          }}
        />
      </div>
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

// --------------------------------------------------------------- PasswordField
export function PasswordField({
  value,
  onChange,
  error,
  label = "Password",
  autoComplete = "current-password",
  placeholder = "••••••••",
  describedById,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
  autoComplete?: string;
  placeholder?: string;
  describedById?: string;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={[error ? errId : null, describedById].filter(Boolean).join(" ") || undefined}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            ...baseInput,
            paddingRight: 48,
            border: `1px solid ${error ? colors.danger : focused ? colors.primary : surfaces.border}`,
            boxShadow: focused ? "0 0 0 3px rgba(10,132,255,0.15)" : "none",
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: radii.sm,
            color: colors.textSecondary,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {show ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
        </button>
      </div>
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

// ------------------------------------------------------------ PasswordChecklist
export function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  const { passed, total } = passwordStrength(value);
  const pct = (passed / total) * 100;
  const barColor = passed <= 2 ? colors.danger : passed < total ? colors.warning : colors.success;
  return (
    <div id={id} aria-live="polite" style={{ marginTop: spacing[0] }}>
      <div
        style={{
          height: 6,
          borderRadius: radii.pill,
          background: surfaces.borderSoft,
          overflow: "hidden",
          marginBottom: spacing[2],
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 200ms ease" }} />
      </div>
      <ul style={{ display: "grid", gap: 6, listStyle: "none", padding: 0, margin: 0 }}>
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.id} className="flex items-center" style={{ gap: 8, fontSize: 13, color: ok ? colors.success : colors.textMuted }}>
              <span
                aria-hidden
                className="inline-flex items-center justify-center"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: radii.pill,
                  background: ok ? colors.success : surfaces.borderSoft,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {ok ? <Check style={{ width: 11, height: 11 }} strokeWidth={3} /> : null}
              </span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------- PinInput
export function PinInput({
  length = 6,
  value,
  onChange,
  onComplete,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.split("").slice(0, length);

  const setDigit = (i: number, d: string) => {
    const next = value.split("");
    next[i] = d;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (d && i < length - 1) refs.current[i + 1]?.focus();
    if (joined.length === length && !joined.includes("")) onComplete?.(joined);
  };

  return (
    <div className="flex" style={{ gap: 8, justifyContent: "space-between" }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={digits[i] ?? ""}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            setDigit(i, d);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (pasted) {
              onChange(pasted);
              if (pasted.length === length) onComplete?.(pasted);
              refs.current[Math.min(pasted.length, length - 1)]?.focus();
            }
          }}
          style={{
            width: `${100 / length}%`,
            aspectRatio: "1 / 1",
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            color: colors.textPrimary,
            background: surfaces.glassSoft,
            border: `1px solid ${digits[i] ? colors.primary : surfaces.border}`,
            borderRadius: radii.md,
            outline: "none",
          }}
        />
      ))}
    </div>
  );
}
