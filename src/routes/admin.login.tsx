// ============================================================================
// /admin/login — administrators authenticate with an Indian mobile number and
// a 6-digit PIN. No email auth. The PIN is the Supabase Auth password (bcrypt).
// Successful auth is only accepted if the account also holds the 'admin' role;
// otherwise the session is discarded and a generic error is shown. Client-side
// brute-force lockout complements Supabase's own rate limiting.
// ============================================================================
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isAdmin, logAdminAction } from "@/lib/admin.functions";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PhoneField } from "@/components/auth/fields";
import { colors, radii, spacing, surfaces } from "@/lib/ds";
import { isValidPhoneIN, normalizePhoneIN, phoneToAlias } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const KEY = "coligo:admin:attempts";

function readAttempts(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as number[];
    return raw.filter((t) => Date.now() - t < LOCK_MS);
  } catch {
    return [];
  }
}
function pushAttempt() {
  const a = readAttempts();
  a.push(Date.now());
  localStorage.setItem(KEY, JSON.stringify(a));
}
function clearAttempts() {
  localStorage.removeItem(KEY);
}

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — Coligo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [fieldErr, setFieldErr] = useState<{ phone?: string; pin?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockLeft, setLockLeft] = useState(0);

  // If already signed in as an admin, skip straight to the dashboard.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        const ok = await isAdmin();
        if (active && ok) navigate({ to: "/admin/dashboard", replace: true });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  // Live lockout countdown.
  useEffect(() => {
    const tick = () => {
      const a = readAttempts();
      if (a.length >= MAX_ATTEMPTS) {
        const oldest = a[0];
        setLockLeft(Math.max(0, Math.ceil((LOCK_MS - (Date.now() - oldest)) / 1000)));
      } else {
        setLockLeft(0);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (lockLeft > 0) {
      setError("Too many attempts. Please wait before trying again.");
      return;
    }

    const errs: { phone?: string; pin?: string } = {};
    if (!isValidPhoneIN(phone)) errs.phone = "Enter a valid 10-digit mobile number.";
    if (!/^\d{6}$/.test(pin)) errs.pin = "PIN must be 6 digits.";
    if (errs.phone || errs.pin) {
      setFieldErr(errs);
      return;
    }
    setFieldErr({});
    setLoading(true);

    const fail = (msg = "Invalid credentials. Access denied.") => {
      pushAttempt();
      haptic("medium");
      setError(msg);
    };

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: phoneToAlias(normalizePhoneIN(phone)),
        password: pin,
      });
      if (signInErr) {
        fail();
        return;
      }
      // Authenticated — now require the admin role, else reject and sign out.
      const ok = await isAdmin().catch(() => false);
      if (!ok) {
        await supabase.auth.signOut();
        fail();
        return;
      }
      clearAttempts();
      haptic("softSuccess");
      try {
        await logAdminAction({ data: { action: "admin_login" } });
      } catch {
        /* non-blocking */
      }
      navigate({ to: "/admin/dashboard", replace: true });
    } catch {
      setError("Unable to sign in right now. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing[4],
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="flex items-center" style={{ gap: spacing[2], marginBottom: spacing[4], color: colors.primary }}>
          <ShieldCheck style={{ width: 26, height: 26 }} />
          <Text variant="headingSm" color={colors.textPrimary}>Coligo Admin</Text>
        </div>

        <GlassPanel style={{ padding: spacing[5] }}>
          <AuthHeader title="Administrator sign in" subtitle="Restricted access. Authorized administrators only." />

          <form onSubmit={onSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
              <PhoneField value={phone} onChange={setPhone} error={fieldErr.phone} autoFocus label="Admin mobile number" />

              <PinField value={pin} onChange={setPin} show={showPin} onToggle={() => setShowPin((s) => !s)} error={fieldErr.pin} />

              {error ? (
                <div
                  role="alert"
                  style={{
                    borderRadius: radii.md,
                    padding: "10px 12px",
                    background: "rgba(255,59,48,0.10)",
                    border: `1px solid rgba(255,59,48,0.25)`,
                    color: colors.danger,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {error}
                </div>
              ) : null}

              {lockLeft > 0 ? (
                <Text variant="caption" style={{ color: colors.warning }}>
                  Locked for {Math.floor(lockLeft / 60)}m {lockLeft % 60}s after too many attempts.
                </Text>
              ) : null}

              <Button type="submit" variant="primary" disabled={loading || lockLeft > 0} style={{ width: "100%" }}>
                {loading ? "Verifying…" : "Sign in"}
              </Button>
            </div>
          </form>

          <div
            className="flex items-start"
            style={{ gap: spacing[2], marginTop: spacing[4], color: colors.textMuted, fontSize: 12.5, lineHeight: 1.5 }}
          >
            <Lock style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />
            <span>
              This portal is monitored. All sign-in attempts and admin actions are logged. Student accounts cannot access
              the admin area.
            </span>
          </div>
        </GlassPanel>

        <div className="text-center" style={{ marginTop: spacing[4] }}>
          <Link to="/" style={{ color: colors.textMuted, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            ← Back to Coligo
          </Link>
        </div>
      </div>
    </div>
  );
}

function PinField({
  value,
  onChange,
  show,
  onToggle,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor="admin-pin"
        style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}
      >
        6-digit PIN
      </label>
      <div
        className="flex items-center"
        style={{
          borderRadius: radii.md,
          background: surfaces.glassSoft,
          border: `1px solid ${error ? colors.danger : surfaces.border}`,
        }}
      >
        <input
          id="admin-pin"
          type={show ? "text" : "password"}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          aria-invalid={!!error}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "13px 16px",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: show ? "0.1em" : "0.35em",
            color: colors.textPrimary,
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide PIN" : "Show PIN"}
          style={{ padding: "0 14px", color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}
        >
          {show ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
        </button>
      </div>
      {error ? (
        <span role="alert" style={{ display: "block", marginTop: 6, color: colors.danger, fontSize: 13, fontWeight: 500 }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
