// /onboarding/name — collect full name.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { OnboardingScreen } from "@/components/onboarding/parts";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { nameSchema, LIMITS } from "@/lib/onboarding";
import { colors, radii, surfaces } from "@/lib/ds";

export const Route = createFileRoute("/onboarding/name")({
  head: () => ({ meta: [{ title: "Your name — Coligo" }, { name: "robots", content: "noindex" }] }),
  component: NameStep,
});

function NameStep() {
  const state = useOnboardingState();
  const [name, setName] = useState(state.fullName ?? "");
  const { submit, loading, error } = useSaveStep("name");
  const valid = nameSchema.safeParse(name).success;

  return (
    <OnboardingScreen
      title="What's your name?"
      subtitle="This is how you'll appear to other students."
      onContinue={() => submit({ full_name: name })}
      continueDisabled={!valid}
      loading={loading}
      error={error}
    >
      <label>
        <span style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>
          Full name
        </span>
        <input
          autoFocus
          value={name}
          maxLength={LIMITS.nameMax}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aditi Sharma"
          aria-label="Full name"
          style={{
            width: "100%",
            borderRadius: radii.md,
            padding: "13px 16px",
            fontSize: 16,
            fontWeight: 500,
            color: colors.textPrimary,
            background: surfaces.glassSoft,
            border: `1px solid ${surfaces.border}`,
            outline: "none",
          }}
        />
      </label>
    </OnboardingScreen>
  );
}
