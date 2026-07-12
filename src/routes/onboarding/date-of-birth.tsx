// /onboarding/date-of-birth — verify age (>= 18).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { OnboardingScreen, InfoNote } from "@/components/onboarding/parts";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { dobSchema, ageFromDob, maxDobString, minDobString } from "@/lib/onboarding";
import { Text } from "@/components/ds/glass";
import { colors, radii, surfaces, spacing } from "@/lib/ds";

export const Route = createFileRoute("/onboarding/date-of-birth")({
  head: () => ({ meta: [{ title: "Your birthday — CampusMatch" }, { name: "robots", content: "noindex" }] }),
  component: DobStep,
});

function DobStep() {
  const state = useOnboardingState();
  const [dob, setDob] = useState(state.dateOfBirth ?? "");
  const { submit, loading, error } = useSaveStep("date-of-birth");
  const parsed = dobSchema.safeParse(dob);
  const age = dob && !Number.isNaN(new Date(dob).getTime()) ? ageFromDob(dob) : null;

  return (
    <OnboardingScreen
      title="When's your birthday?"
      subtitle="You must be 18 or older to use CampusMatch."
      onContinue={() => submit({ date_of_birth: dob })}
      continueDisabled={!parsed.success}
      loading={loading}
      error={error ?? (dob && !parsed.success ? parsed.error?.issues[0]?.message : null)}
    >
      <label>
        <span style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>
          Date of birth
        </span>
        <input
          type="date"
          value={dob}
          min={minDobString()}
          max={maxDobString()}
          onChange={(e) => setDob(e.target.value)}
          aria-label="Date of birth"
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
      {age != null && age >= 18 ? (
        <Text variant="bodySm" tone="secondary" style={{ marginTop: spacing[2] }}>
          You're {age} — perfect.
        </Text>
      ) : null}
      <InfoNote>Your exact birth date stays private. Only your age is shown on your profile.</InfoNote>
    </OnboardingScreen>
  );
}
