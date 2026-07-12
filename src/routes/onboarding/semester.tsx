// /onboarding/semester — current semester.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { OnboardingScreen, OptionTile } from "@/components/onboarding/parts";
import { useOnboardingState, useSaveStep } from "@/components/onboarding/useOnboarding";
import { SEMESTER_OPTIONS } from "@/lib/onboarding";
import { spacing } from "@/lib/ds";

export const Route = createFileRoute("/onboarding/semester")({
  head: () => ({ meta: [{ title: "Your semester — Coligo" }, { name: "robots", content: "noindex" }] }),
  component: SemesterStep,
});

function SemesterStep() {
  const state = useOnboardingState();
  const [sem, setSem] = useState<number | null>(state.semester);
  const { submit, loading, error } = useSaveStep("semester");

  return (
    <OnboardingScreen
      title="Which semester are you in?"
      subtitle="Pick your current semester."
      onContinue={() => sem && submit({ semester: sem })}
      continueDisabled={!sem}
      loading={loading}
      error={error}
    >
      <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: spacing[2] }}>
        {SEMESTER_OPTIONS.map((s) => (
          <OptionTile key={s} label={String(s)} selected={sem === s} onClick={() => setSem(s)} />
        ))}
      </div>
    </OnboardingScreen>
  );
}
