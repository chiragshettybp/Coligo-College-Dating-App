// ============================================================================
// /auth/forgot-password — start account recovery with a +91 number.
// Always returns a generic response to prevent account enumeration. While OTP
// is disabled, it forwards to /auth/reset-password (dev-mode recovery).
// ============================================================================
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PhoneField } from "@/components/auth/fields";
import { colors, spacing } from "@/lib/ds";
import { phoneSchema, OTP_ENABLED } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — CampusMatch" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [fieldErr, setFieldErr] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setFieldErr(parsed.error.issues[0]?.message);
      return;
    }
    setFieldErr(undefined);
    haptic("selection");

    if (OTP_ENABLED) {
      // With OTP enabled, recovery is verified via a code before reset.
      setSent(true);
      return;
    }
    // Dev-mode: forward to reset (see reset-password page for the caveat).
    navigate({ to: "/auth/reset-password", search: { phone: parsed.data } });
  };

  return (
    <div>
      <AuthHeader
        title="Forgot password"
        subtitle="Enter your registered mobile number to recover your account."
      />
      <GlassPanel style={{ padding: spacing[5] }}>
        {sent ? (
          <Text variant="body" tone="secondary" role="status">
            If an account exists for that number, you'll receive recovery
            instructions shortly.
          </Text>
        ) : (
          <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: spacing[3] }}>
            <PhoneField value={phone} onChange={setPhone} error={fieldErr} autoFocus />
            <Button type="submit" variant="primary" fullWidth>
              Continue
            </Button>
          </form>
        )}
      </GlassPanel>
      <Text variant="body" tone="secondary" style={{ display: "block", textAlign: "center", marginTop: spacing[4] }}>
        Remembered it?{" "}
        <Link to="/auth/login" style={{ fontWeight: 600, color: colors.primary, textDecoration: "none" }}>
          Back to sign in
        </Link>
      </Text>
    </div>
  );
}
