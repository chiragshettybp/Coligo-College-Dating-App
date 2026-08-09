// ============================================================================
// /auth/signup — register a new verified-student account with a +91 number.
// Step 1: mobile number (availability checked server-side).
// Step 2: create a password (OTP is disabled, so the account is created now).
// When OTP is enabled this step routes to /auth/verify-otp instead.
// ============================================================================
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { touchLastLogin } from "@/lib/profile.functions";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PhoneField, PasswordField, PasswordChecklist } from "@/components/auth/fields";
import { colors, spacing } from "@/lib/ds";
import {
  phoneSchema,
  signupSchema,
  passwordStrength,
  phoneToAlias,
  formatPhoneIN,
  friendlyAuthError,
  OTP_ENABLED,
  toE164,
} from "@/lib/auth";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Create your Coligo account — Join Verified Students" },
      {
        name: "description",
        content: "Join Coligo — the exclusive dating app for verified college students in India. Start connecting safely.",
      },
      { property: "og:title", content: "Join Coligo — Verified Dating" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErr, setFieldErr] = useState<{ phone?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setFieldErr({ phone: parsed.error.issues[0]?.message });
      return;
    }
    setFieldErr({});
    setLoading(true);
    try {
      const { data: available, error: rpcErr } = await supabase.rpc("phone_available", {
        _e164: toE164(parsed.data),
      });
      if (rpcErr) throw rpcErr;
      if (!available) {
        setFieldErr({ phone: "An account with this number already exists." });
        return;
      }
      haptic("selection");
      setStep("password");
    } catch {
      setError("Couldn't verify that number. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const parsed = signupSchema.safeParse({ phone, password });
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
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: phoneToAlias(parsed.data.phone),
        password: parsed.data.password,
        options: {
          data: { phone: toE164(parsed.data.phone) },
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (signUpErr) throw signUpErr;

      if (OTP_ENABLED) {
        navigate({ to: "/auth/verify-otp", search: { phone: parsed.data.phone } });
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: phoneToAlias(parsed.data.phone),
        password: parsed.data.password,
      });
      if (signInErr) throw signInErr;
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
      {step === "phone" ? (
        <>
          <AuthHeader title="Create your account" subtitle="Join the verified college dating community." />
          <GlassPanel style={{ padding: spacing[5] }}>
            <form onSubmit={onContinue} noValidate style={{ display: "grid", gap: spacing[3] }}>
              <PhoneField value={phone} onChange={setPhone} error={fieldErr.phone} autoFocus />
              {error ? (
                <Text variant="bodySm" role="alert" style={{ color: colors.danger }}>
                  {error}
                </Text>
              ) : null}
              <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading}>
                Continue
              </Button>
            </form>
          </GlassPanel>
          <Text variant="body" tone="secondary" style={{ display: "block", textAlign: "center", marginTop: spacing[4] }}>
            Already have an account?{" "}
            <Link to="/auth/login" style={{ fontWeight: 600, color: colors.primary, textDecoration: "none" }}>
              Sign in
            </Link>
          </Text>
        </>
      ) : (
        <>
          <AuthHeader title="Set a password" subtitle={`Securing +91 ${formatPhoneIN(phone)}`} />
          <GlassPanel style={{ padding: spacing[5] }}>
            <form onSubmit={onCreate} noValidate style={{ display: "grid", gap: spacing[3] }}>
              <PasswordField
                value={password}
                onChange={setPassword}
                error={fieldErr.password}
                label="Create password"
                autoComplete="new-password"
                describedById="signup-pw-rules"
              />
              <PasswordChecklist value={password} id="signup-pw-rules" />
              {error ? (
                <Text variant="bodySm" role="alert" style={{ color: colors.danger }}>
                  {error}
                </Text>
              ) : null}
              <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading || !passwordStrength(password).ok}>
                Create account
              </Button>
            </form>
          </GlassPanel>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFieldErr({});
              setStep("phone");
            }}
            className="inline-flex items-center"
            style={{ gap: 6, margin: `${spacing[4]}px auto 0`, display: "flex", color: colors.textSecondary, background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Change number
          </button>
        </>
      )}
    </div>
  );
}
