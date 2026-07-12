import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { SegmentControl } from "@/components/ds/navigation";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, surfaces, gradients } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CampusMatch" },
      {
        name: "description",
        content: "Sign in or create your CampusMatch account to start connecting with verified college students.",
      },
    ],
  }),
  component: AuthPage,
});

const fieldStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: radii.md,
  padding: "12px 16px",
  fontSize: 16,
  fontWeight: 500,
  color: colors.textPrimary,
  background: surfaces.glassSoft,
  border: `1px solid ${surfaces.border}`,
  outline: "none",
};

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        haptic("softSuccess");
        setNotice("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        haptic("softSuccess");
        navigate({ to: "/" });
      }
    } catch (err) {
      haptic("medium");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        fontFamily: FONT_FAMILY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing[4],
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link
          to="/"
          className="inline-flex items-center"
          style={{ gap: spacing[0], color: colors.textSecondary, textDecoration: "none", fontSize: 15, fontWeight: 600 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back
        </Link>

        <div className="flex items-center" style={{ gap: spacing[1], marginTop: spacing[4] }}>
          <span
            aria-hidden
            className="inline-flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: radii.md, background: gradients.primaryButton, color: "#fff" }}
          >
            <Heart style={{ width: 20, height: 20, fill: "currentColor" }} />
          </span>
          <Text variant="headingMd" color={colors.textPrimary}>
            CampusMatch
          </Text>
        </div>

        <Text variant="displaySm" color={colors.textPrimary} style={{ marginTop: spacing[4] }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
          {mode === "signin"
            ? "Sign in to continue to CampusMatch."
            : "Join the verified college dating community."}
        </Text>

        <GlassPanel soft style={{ padding: spacing[5], marginTop: spacing[5] }}>
          <SegmentControl
            options={["Sign in", "Sign up"]}
            value={mode === "signin" ? 0 : 1}
            onChange={(i) => {
              setMode(i === 0 ? "signin" : "signup");
              setError(null);
              setNotice(null);
            }}
          />

          <form onSubmit={onSubmit} style={{ display: "grid", gap: spacing[3], marginTop: spacing[4] }}>
            <div>
              <label
                htmlFor="auth-email"
                style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                style={fieldStyle}
              />
            </div>
            <div>
              <label
                htmlFor="auth-password"
                style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={fieldStyle}
              />
            </div>

            {error ? (
              <Text variant="bodySm" style={{ color: colors.danger }} role="alert">
                {error}
              </Text>
            ) : null}
            {notice ? (
              <Text variant="bodySm" style={{ color: colors.success }} role="status">
                {notice}
              </Text>
            ) : null}

            <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
}
