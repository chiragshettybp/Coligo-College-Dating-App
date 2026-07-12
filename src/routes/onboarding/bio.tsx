// /onboarding/bio — short self introduction.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { OnboardingScreen } from "@/components/onboarding/parts";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { LIMITS } from "@/lib/onboarding";
import { Text } from "@/components/ds/glass";
import { colors, radii, surfaces } from "@/lib/ds";

export const Route = createFileRoute("/onboarding/bio")({
  head: () => ({ meta: [{ title: "Your bio — Coligo" }, { name: "robots", content: "noindex" }] }),
  component: BioStep,
});

function BioStep() {
  const state = useOnboardingState();
  const [bio, setBio] = useState(state.bio ?? "");
  const { submit, loading, error } = useSaveStep("bio");
  const remaining = LIMITS.bioMax - bio.length;

  return (
    <OnboardingScreen
      title="Write a short bio"
      subtitle="Share something real — hobbies, what you're studying, a fun fact."
      onContinue={() => submit({ bio: bio.trim() })}
      continueDisabled={bio.length > LIMITS.bioMax}
      loading={loading}
      error={error}
    >
      <label>
        <span style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>
          About you
        </span>
        <textarea
          autoFocus
          value={bio}
          maxLength={LIMITS.bioMax}
          onChange={(e) => setBio(e.target.value)}
          rows={6}
          placeholder="I love filter coffee, weekend treks, and building side projects…"
          aria-label="Bio"
          style={{
            width: "100%",
            borderRadius: radii.md,
            padding: "13px 16px",
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.5,
            color: colors.textPrimary,
            background: surfaces.glassSoft,
            border: `1px solid ${surfaces.border}`,
            outline: "none",
            resize: "vertical",
          }}
        />
      </label>
      <div style={{ textAlign: "right", marginTop: 6 }}>
        <Text variant="caption" tone={remaining < 20 ? "muted" : "muted"}>
          {remaining} characters left
        </Text>
      </div>
    </OnboardingScreen>
  );
}
