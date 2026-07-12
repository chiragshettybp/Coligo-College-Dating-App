// ============================================================================
// /auth/login — existing users sign in with +91 mobile + password.
// ============================================================================
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { touchLastLogin } from "@/lib/profile.functions";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PhoneField, PasswordField } from "@/components/auth/fields";
import { colors, spacing } from "@/lib/ds";
import { loginSchema, phoneToAlias, friendlyAuthError } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CampusMatch" },
      { name: "description", content: "Sign in to CampusMatch to connect with verified college students." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [fieldErr, setFieldErr] = useState<{ phone?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const parsed = loginSchema.safeParse({ phone, password });
    if (!parsed.success) {
      const errs: { phone?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as "phone" | "password";
        if (!errs[k]) errs[k] = issue.message;
      }
      setFieldErr(errs);
      return;
    }
    setFieldErr({});
    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: phoneToAlias(parsed.data.phone),
        password: parsed.data.password,
      });
      if (signInErr) throw signInErr;
      // Remember-me: when off, mark the session ephemeral so it clears on a
      // fresh browser launch (see __root session guard).
      if (remember) localStorage.removeItem("cm:ephemeral");
      else {
        localStorage.setItem("cm:ephemeral", "1");
        sessionStorage.setItem("cm:session", "1");
      }
      haptic("softSuccess");
      try {
        await touchLastLogin();
      } catch {
        /* non-blocking */
      }
      navigate({ to: "/system/splash", replace: true });
    } catch (err) {
      haptic("medium");
      setError(friendlyAuthError(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AuthHeader title="Welcome back" subtitle="Sign in to continue to CampusMatch." />
      <GlassPanel style={{ padding: spacing[5] }}>
        <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: spacing[3] }}>
          <PhoneField value={phone} onChange={setPhone} error={fieldErr.phone} autoFocus />
          <PasswordField value={password} onChange={setPassword} error={fieldErr.password} autoComplete="current-password" />

          <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
            <label className="flex items-center" style={{ gap: 8, cursor: "pointer", fontSize: 14, color: colors.textSecondary, fontWeight: 500 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 16, height: 16, accentColor: colors.primary }} />
              Remember me
            </label>
            <Link to="/auth/forgot-password" style={{ fontSize: 14, fontWeight: 600, color: colors.primary, textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>

          {error ? (
            <Text variant="bodySm" role="alert" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}

          <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading} style={{ marginTop: spacing[1] }}>
            Sign in
          </Button>
        </form>
      </GlassPanel>

      <Text variant="body" tone="secondary" style={{ display: "block", textAlign: "center", marginTop: spacing[4] }}>
        New to CampusMatch?{" "}
        <Link to="/auth/signup" style={{ fontWeight: 600, color: colors.primary, textDecoration: "none" }}>
          Create an account
        </Link>
      </Text>
    </div>
  );
}
