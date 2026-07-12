// ============================================================================
// /auth/verify-otp — mobile ownership verification.
// Fully built to spec (6-digit entry, countdown, resend, change number). While
// OTP is disabled (no SMS provider) it shows a clear status and routes users on;
// flipping OTP_ENABLED activates the real Supabase SMS verification below.
// ============================================================================
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PinInput } from "@/components/auth/fields";
import { colors, spacing, radii, gradients } from "@/lib/ds";
import { OTP_ENABLED, toE164, formatPhoneIN, normalizePhoneIN, friendlyAuthError } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

const RESEND_COOLDOWN = 30;

export const Route = createFileRoute("/auth/verify-otp")({
  validateSearch: (search: Record<string, unknown>) => ({
    phone: typeof search.phone === "string" ? search.phone : "",
  }),
  head: () => ({ meta: [{ title: "Verify your number — CampusMatch" }] }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const { phone } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const verify = async (value: string) => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        phone: toE164(phone),
        token: value,
        type: "sms",
      });
      if (vErr) throw vErr;
      haptic("softSuccess");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      haptic("medium");
      setError(friendlyAuthError(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      await supabase.auth.signInWithOtp({ phone: toE164(phone) });
      setCooldown(RESEND_COOLDOWN);
      haptic("selection");
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : undefined));
    }
  };

  const pretty = phone ? `+91 ${formatPhoneIN(normalizePhoneIN(phone))}` : "your mobile number";

  // ---- OTP disabled state -------------------------------------------------
  if (!OTP_ENABLED) {
    return (
      <div>
        <AuthHeader title="Verification" subtitle="Mobile OTP verification is currently turned off." />
        <GlassPanel style={{ padding: spacing[5] }}>
          <span
            aria-hidden
            className="inline-flex items-center justify-center"
            style={{ width: 48, height: 48, borderRadius: radii.lg, background: gradients.primaryButton, color: "#fff" }}
          >
            <ShieldCheck style={{ width: 24, height: 24 }} />
          </span>
          <Text variant="title" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
            No code needed right now
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
            OTP verification will be enabled soon. For now you can sign in
            directly with your mobile number and password.
          </Text>
          <div style={{ marginTop: spacing[4] }}>
            <Link to="/auth/login" style={{ textDecoration: "none" }}>
              <Button variant="primary" fullWidth>
                Continue to sign in
              </Button>
            </Link>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // ---- OTP enabled state --------------------------------------------------
  return (
    <div>
      <AuthHeader title="Verify your number" subtitle={`Enter the 6-digit code sent to ${pretty}.`} />
      <GlassPanel style={{ padding: spacing[5] }}>
        <div style={{ display: "grid", gap: spacing[4] }}>
          <PinInput value={code} onChange={setCode} onComplete={verify} />
          {error ? (
            <Text variant="bodySm" role="alert" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
          <Button variant="primary" fullWidth loading={loading} disabled={loading || code.length !== 6} onClick={() => verify(code)}>
            Verify
          </Button>
          <div className="flex items-center justify-center" style={{ gap: 6 }}>
            {cooldown > 0 ? (
              <Text variant="bodySm" tone="muted">
                Resend code in {cooldown}s
              </Text>
            ) : (
              <button type="button" onClick={resend} style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.primary, fontSize: 14, fontWeight: 600 }}>
                Resend code
              </button>
            )}
          </div>
        </div>
      </GlassPanel>
      <Link
        to="/auth/signup"
        className="inline-flex items-center"
        style={{ gap: 6, margin: `${spacing[4]}px auto 0`, display: "flex", width: "fit-content", color: colors.textSecondary, textDecoration: "none", fontSize: 14, fontWeight: 600 }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Change mobile number
      </Link>
    </div>
  );
}
