// ============================================================================
// /auth/reset-password — set a new password.
// Two supported paths:
//  1. Supabase recovery link (type=recovery in the URL hash) -> updateUser.
//  2. Dev-mode phone recovery (?phone=...) while OTP is disabled -> admin reset.
//     NOTE: path 2 is intentionally not production-safe (see auth.functions.ts)
//     and is superseded automatically once OTP verification is enabled.
// ============================================================================
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { touchLastLogin } from "@/lib/profile.functions";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PasswordField, PasswordChecklist } from "@/components/auth/fields";
import { colors, spacing } from "@/lib/ds";
import { passwordSchema, passwordStrength, phoneToAlias, toE164, friendlyAuthError } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    phone: typeof search.phone === "string" ? search.phone : "",
  }),
  head: () => ({ meta: [{ title: "Set new password — CampusMatch" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { phone } = Route.useSearch();
  const navigate = useNavigate();
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErr, setFieldErr] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detect a Supabase recovery session from an emailed link.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      supabase.auth.getSession().then(({ data }) => setHasRecoverySession(!!data.session));
    }
  }, []);

  const invalidEntry = !phone && !hasRecoverySession;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const pw = passwordSchema.safeParse(password);
    const errs: { password?: string; confirm?: string } = {};
    if (!pw.success) errs.password = pw.error.issues[0]?.message;
    if (password !== confirm) errs.confirm = "Passwords do not match.";
    if (errs.password || errs.confirm) {
      setFieldErr(errs);
      return;
    }
    setFieldErr({});
    setLoading(true);
    try {
      if (hasRecoverySession) {
        const { error: uErr } = await supabase.auth.updateUser({ password });
        if (uErr) throw uErr;
      } else {
        await resetPasswordByPhone({ data: { phone, password } });
        const { error: sErr } = await supabase.auth.signInWithPassword({
          email: phoneToAlias(phone),
          password,
        });
        if (sErr) throw sErr;
      }
      haptic("softSuccess");
      try {
        await touchLastLogin();
      } catch {
        /* non-blocking */
      }
      navigate({ to: "/app", replace: true });
    } catch (err) {
      haptic("medium");
      setError(friendlyAuthError(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  if (invalidEntry) {
    return (
      <div>
        <AuthHeader title="Link expired" subtitle="This recovery link is invalid or has expired." />
        <GlassPanel style={{ padding: spacing[5] }}>
          <Link to="/auth/forgot-password" style={{ textDecoration: "none" }}>
            <Button variant="primary" fullWidth>
              Start recovery again
            </Button>
          </Link>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div>
      <AuthHeader title="Set a new password" subtitle="Choose a strong password you haven't used before." />
      <GlassPanel style={{ padding: spacing[5] }}>
        <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: spacing[3] }}>
          <PasswordField
            value={password}
            onChange={setPassword}
            error={fieldErr.password}
            label="New password"
            autoComplete="new-password"
            describedById="reset-pw-rules"
          />
          <PasswordChecklist value={password} id="reset-pw-rules" />
          <PasswordField
            value={confirm}
            onChange={setConfirm}
            error={fieldErr.confirm}
            label="Confirm password"
            autoComplete="new-password"
          />
          {error ? (
            <Text variant="bodySm" role="alert" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
          <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading || !passwordStrength(password).ok}>
            Save new password
          </Button>
        </form>
      </GlassPanel>
      <Text variant="body" tone="secondary" style={{ display: "block", textAlign: "center", marginTop: spacing[4] }}>
        <Link to="/auth/login" style={{ fontWeight: 600, color: colors.primary, textDecoration: "none" }}>
          Back to sign in
        </Link>
      </Text>
    </div>
  );
}
